import * as LegacyFileSystem from "expo-file-system/legacy";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { ChatMessage, GraphNode, NodeType } from "@/types/models";
import { makeId } from "@/utils/id";

const VAULT_NAME = "vault";
const HISTORY_NAME = "history.md";

let vaultDirectory: Directory | null = null;

export function getVaultDirectory(): Directory {
  if (!vaultDirectory) {
    vaultDirectory = new Directory(Paths.document, VAULT_NAME);
  }
  return vaultDirectory;
}

export function ensureVault(): Directory {
  const directory = getVaultDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

export function buildNodeFileUri(id: string, type: NodeType): string {
  const extension = type === "pdf" ? "pdf" : type === "image" ? "jpg" : type === "file" ? "bin" : "md";
  return new File(getVaultDirectory(), `${id}.${extension}`).uri;
}

export function contentFileForNode(node: Pick<GraphNode, "id">): File {
  return new File(getVaultDirectory(), `${node.id}.md`);
}

export async function readNodeContent(node: GraphNode): Promise<string> {
  if (typeof node.content === "string") return node.content;
  ensureVault();
  const file = contentFileForNode(node);
  if (!file.exists) return "";
  try {
    return await file.text();
  } catch {
    return "";
  }
}

/** Reads the note body, creating an empty .md file when the node does not have one yet. */
export async function ensureNodeMarkdown(node: GraphNode): Promise<{ content: string; created: boolean }> {
  if (typeof node.content === "string") return { content: node.content, created: false };
  ensureVault();
  const file = contentFileForNode(node);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
    await file.write("");
    return { content: "", created: true };
  }
  try {
    return { content: await file.text(), created: false };
  } catch {
    return { content: "", created: false };
  }
}

export async function writeNodeContent(node: GraphNode, content: string): Promise<void> {
  ensureVault();
  const file = contentFileForNode(node);
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  await file.write(content);
}

/**
 * Deletes files created by Kosaa. This is only used for rollbacks, never when
 * the user removes a node: attachments remain on the device by design.
 */
export function deleteNodeFiles(node: GraphNode): void {
  const targets = [contentFileForNode(node)];
  if (node.type !== "md") targets.push(new File(node.filePath));
  for (const file of targets) {
    try {
      if (file.exists) file.delete();
    } catch {
      // A missing or locked file must never block cleanup.
    }
  }
}

function base64ToBytes(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = input.replace(/[^A-Za-z0-9+/=]/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const output = new Uint8Array(Math.floor((clean.length * 3) / 4) - padding);
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (let position = 0; position < clean.length; position += 1) {
    const character = clean[position];
    if (character === "=") break;
    const value = alphabet.indexOf(character);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output[index] = (buffer >> bits) & 0xff;
      index += 1;
    }
  }
  return output;
}

/**
 * DocumentPicker may hand back a content:// URI with a short-lived grant.
 * The new File.copy implementation cannot always read that grant, so we fall
 * back to the legacy ContentResolver copy and, finally, base64 bytes.
 */
async function copyPickedFile(uri: string, destination: File): Promise<void> {
  const legacyCopy = async (): Promise<boolean> => {
    try {
      if (destination.exists) destination.delete();
      await LegacyFileSystem.copyAsync({ from: uri, to: destination.uri });
      return destination.exists;
    } catch {
      return false;
    }
  };

  // content:// grants are best handled by the legacy ContentResolver copy.
  // Expo Go's DocumentPicker cache files are unreadable on some Android
  // devices, so we deliberately ask the picker not to create them.
  if (uri.startsWith("content://") && (await legacyCopy())) return;

  try {
    const source = new File(uri);
    await source.copy(destination);
    if (destination.exists) return;
  } catch {
    // Fall through to the legacy ContentResolver implementation.
  }

  if (await legacyCopy()) return;

  const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
    encoding: LegacyFileSystem.EncodingType.Base64,
  });
  if (!base64) throw new Error("File yang dipilih tidak bisa dibaca.");
  if (destination.exists) destination.delete();
  destination.create({ intermediates: true, overwrite: true });
  await destination.write(base64ToBytes(base64));
  if (!destination.exists) throw new Error("File yang dipilih gagal disalin.");
}

function extensionFromName(name: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return match ? match[1].toLowerCase() : "";
}

function mimeFromName(name: string): string {
  const extension = extensionFromName(name);
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "";
}

function typeForMime(mime: string, name: string): NodeType {
  if (mime === "application/pdf" || extensionFromName(name) === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  return "file";
}

function extensionFor(type: NodeType, mime: string, name: string): string {
  const fromName = extensionFromName(name);
  if (fromName) return fromName;
  if (type === "pdf") return "pdf";
  if (type === "image") {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    return "jpg";
  }
  return "bin";
}

export interface StoredAttachment {
  type: NodeType;
  filePath: string;
  mimeType: string;
  extension: string;
  /** True while PDF → Markdown conversion is still "coming soon". */
  conversionPending: boolean;
}

export async function storeAttachment(
  id: string,
  uri: string,
  name: string,
  providedMime?: string,
): Promise<StoredAttachment> {
  const mime = providedMime && providedMime !== "application/octet-stream" ? providedMime : mimeFromName(name);
  const extensionGuess = extensionFromName(name);
  const audioExtensions = ["mp3", "wav", "m4a", "aac", "ogg", "flac", "opus", "amr"];
  if (mime.startsWith("audio/") || audioExtensions.includes(extensionGuess)) {
    throw new Error("Lampiran audio belum didukung.");
  }

  const type = typeForMime(mime, name);
  const extension = extensionFor(type, mime, name);
  const directory = ensureVault();
  const destination = new File(directory, `${id}.${extension}`);
  await copyPickedFile(uri, destination);

  return {
    type,
    filePath: destination.uri,
    mimeType: mime || (type === "pdf" ? "application/pdf" : ""),
    extension,
    // PDF → .md conversion ships later; the binary stays available and the note
    // says "coming soon" instead of pretending to have extracted the text.
    conversionPending: type === "pdf",
  };
}

export async function openNodeAttachment(node: GraphNode): Promise<void> {
  const file = new File(node.filePath);
  if (!file.exists) {
    throw new Error("File lampiran tidak ditemukan di perangkat.");
  }

  try {
    if (await File.canPreview(file)) {
      await File.preview(file);
      return;
    }
  } catch {
    // Fall back to the share sheet.
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: node.mimeType || undefined,
      dialogTitle: "Buka lampiran",
    });
    return;
  }

  throw new Error("Tidak ada aplikasi yang bisa membuka file ini.");
}

export function attachmentFileName(node: GraphNode): string {
  const raw = node.filePath.split("/").pop() ?? "lampiran";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function readHistoryFile(): Promise<ChatMessage[]> {
  const file = new File(Paths.document, HISTORY_NAME);
  if (!file.exists) return [];
  try {
    return parseHistory(await file.text());
  } catch {
    return [];
  }
}

export function parseHistory(markdown: string): ChatMessage[] {
  const lines = markdown.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;
  const body: string[] = [];

  const flush = () => {
    if (!current) return;
    current.content = body.join("\n").trim();
    if (current.content) messages.push(current);
    body.length = 0;
  };

  for (const line of lines) {
    const heading = line.match(/^### (user|assistant) · (.+)$/);
    if (heading) {
      flush();
      const timestamp = Date.parse(heading[2]);
      current = {
        id: makeId("msg"),
        role: heading[1] as ChatMessage["role"],
        content: "",
        createdAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
      };
      continue;
    }
    if (current) body.push(line);
  }
  flush();
  return messages;
}

export async function saveHistoryFile(messages: ChatMessage[]): Promise<void> {
  const trimmed = messages.slice(-500);
  const markdown = [
    "# Kosaa · History",
    "",
    ...trimmed.map(
      (message) =>
        `### ${message.role} · ${new Date(message.createdAt).toISOString()}\n${message.content.trim()}\n`,
    ),
  ].join("\n");

  const file = new File(Paths.document, HISTORY_NAME);
  if (!file.exists) file.create({ intermediates: true, overwrite: true });
  await file.write(markdown);
}

export async function clearHistoryFile(): Promise<void> {
  const file = new File(Paths.document, HISTORY_NAME);
  if (file.exists) file.delete();
}

export function getVaultFiles(): File[] {
  const directory = ensureVault();
  return directory.list().filter((entry): entry is File => entry instanceof File);
}

export function getHistoryFile(): File {
  return new File(Paths.document, HISTORY_NAME);
}
