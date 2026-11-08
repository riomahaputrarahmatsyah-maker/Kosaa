/**
 * PDF text extractor.
 *
 * Dormant since 1.0.2: PDF → .md conversion is advertised as "coming soon", so
 * `storeAttachment` no longer calls into this file. Keep it around (and tested
 * by the type checker) for the release that ships the real conversion.
 */
import { inflate } from "pako";

export interface PdfExtraction {
  text: string;
  pageCount: number;
  encrypted: boolean;
}

/** Decode bytes as latin1 without blowing the call stack on large PDFs. */
function bytesToBinaryString(bytes: Uint8Array): string {
  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    result += String.fromCharCode(bytes[index]);
  }
  return result;
}

function decodePdfString(raw: string): string {
  let result = "";
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char !== "\\") {
      result += char;
      continue;
    }
    const next = raw[index + 1];
    index += 1;
    if (!next) break;
    switch (next) {
      case "n":
        result += "\n";
        break;
      case "r":
        result += "\r";
        break;
      case "t":
        result += "\t";
        break;
      case "b":
        result += "\b";
        break;
      case "f":
        result += "\f";
        break;
      case "(":
      case ")":
      case "\\":
        result += next;
        break;
      case "\n":
        break;
      case "\r":
        if (raw[index + 1] === "\n") index += 1;
        break;
      default: {
        if (/[0-7]/.test(next)) {
          let octal = next;
          for (let extra = 0; extra < 2; extra += 1) {
            const digit = raw[index + 1];
            if (digit && /[0-7]/.test(digit)) {
              octal += digit;
              index += 1;
            }
          }
          result += String.fromCharCode(parseInt(octal, 8));
        } else {
          result += next;
        }
      }
    }
  }
  return result;
}

function utf16beFromBytes(bytes: number[]): string {
  let decoded = "";
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    decoded += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }
  return decoded;
}

/**
 * Hex strings in PDFs can contain ASCII text, UTF-16BE text or CID glyph ids.
 * CID bytes decode into unreadable Latin-1 garbage, so those strings are
 * dropped instead of being written into the markdown note.
 */
function decodeHexString(raw: string): string {
  const hex = raw.replace(/[^0-9A-Fa-f]/g, "");
  if (!hex) return "";

  if (hex.startsWith("FEFF") || hex.startsWith("feff")) {
    const bytes: number[] = [];
    for (let index = 4; index < hex.length - 1; index += 2) {
      bytes.push(parseInt(hex.slice(index, index + 2), 16));
    }
    return utf16beFromBytes(bytes);
  }

  const bytes: number[] = [];
  for (let index = 0; index < hex.length - 1; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }

  const highZeroBytes = bytes.filter((value, index) => index % 2 === 0 && value === 0).length;
  if (bytes.length >= 4 && highZeroBytes > bytes.length / 4) {
    return utf16beFromBytes(bytes);
  }

  const bad = bytes.filter(
    (value) => value > 0x7e || (value < 0x20 && value !== 0x09 && value !== 0x0a && value !== 0x0d),
  ).length;
  if (bytes.length > 0 && bad / bytes.length > 0.2) return "";

  return bytes.map((value) => String.fromCharCode(value)).join("");
}

function sanitizeChunk(value: string): string {
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  if (!cleaned) return "";
  const high = Array.from(cleaned).filter((character) => character.charCodeAt(0) > 0x7e).length;
  if (cleaned.length > 4 && high / cleaned.length > 0.25) return "";
  return cleaned;
}

/**
 * Extracts the visible text from a PDF content stream. Handles the common
 * Tj/TJ operators and FlateDecode streams; scanned PDFs return an empty body.
 */
function extractFromContentStream(stream: string): string {
  const tokenPattern =
    /\((?:\\.|[^\\()])*\)|<([0-9A-Fa-f\s]+)>|(\bTj\b|\bTJ\b|\bT\*\b|\bTd\b|\bTD\b|\bET\b|'|")/g;
  let text = "";
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(stream)) !== null) {
    if (match[0].startsWith("(")) {
      text += sanitizeChunk(decodePdfString(match[0].slice(1, -1)));
      continue;
    }
    if (match[1] !== undefined) {
      text += sanitizeChunk(decodeHexString(match[1]));
      continue;
    }
    const operator = match[2];
    if (
      operator === "Td" ||
      operator === "TD" ||
      operator === "T*" ||
      operator === "ET" ||
      operator === "'" ||
      operator === '"'
    ) {
      text += "\n";
    }
  }

  return text;
}

function cleanText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFD]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isReadableText(text: string): boolean {
  if (text.length < 10) return false;
  let good = 0;
  let letters = 0;
  let high = 0;

  for (const character of text) {
    const code = character.charCodeAt(0);
    if (/[A-Za-z0-9]/.test(character)) {
      good += 1;
      letters += 1;
    } else if (" \n\r\t.,;:!?'\"()-[]{}/*+=<>%&@#_|~$^".includes(character)) {
      good += 1;
    }
    if (code > 0x7e) high += 1;
  }

  if (letters < 8) return false;
  if (good / text.length < 0.75) return false;
  if (high / text.length > 0.2) return false;
  return true;
}

function streamLooksLikeContent(header: string): boolean {
  return !/\/Subtype\s*\/(Image|XML)|\/FontFile|\/Type\s*\/(Font|ObjStm|XRef|Metadata)|\/Length1/.test(
    header,
  );
}

export function extractPdfText(bytes: Uint8Array): PdfExtraction {
  const binary = bytesToBinaryString(bytes);
  const encrypted = /\/Encrypt\b/.test(binary);
  const pageCount = Math.max(1, (binary.match(/\/Type\s*\/Page\b/g) ?? []).length);

  if (encrypted) {
    return { text: "", pageCount, encrypted: true };
  }

  const chunks: string[] = [];
  const marker = "stream";
  let searchFrom = 0;

  while (searchFrom < binary.length) {
    const streamIndex = binary.indexOf(marker, searchFrom);
    if (streamIndex < 0) break;

    let dataStart = streamIndex + marker.length;
    if (binary[dataStart] === "\r") dataStart += 1;
    if (binary[dataStart] === "\n") dataStart += 1;

    const endIndex = binary.indexOf("endstream", dataStart);
    if (endIndex < 0) break;

    const dictionaryStart = binary.lastIndexOf("<<", streamIndex);
    const headerWindow =
      dictionaryStart >= 0 && streamIndex - dictionaryStart < 2400
        ? binary.slice(dictionaryStart, streamIndex)
        : binary.slice(Math.max(0, streamIndex - 400), streamIndex);
    const isFlate = headerWindow.includes("/FlateDecode");
    const raw = binary.slice(dataStart, endIndex);

    try {
      if (streamLooksLikeContent(headerWindow)) {
        if (isFlate) {
          const inflated = inflate(
            Uint8Array.from(raw, (character) => character.charCodeAt(0) & 0xff),
          );
          const streamText = bytesToBinaryString(inflated);
          if (streamText.includes("BT") && (streamText.includes("Tj") || streamText.includes("TJ"))) {
            chunks.push(extractFromContentStream(streamText));
          }
        } else if (raw.includes("BT") && (raw.includes("Tj") || raw.includes("TJ"))) {
          chunks.push(extractFromContentStream(raw));
        }
      }
    } catch {
      // Corrupt or unsupported stream: continue with the next object.
    }

    searchFrom = endIndex + "endstream".length;
  }

  const text = cleanText(chunks.join("\n"));
  return {
    text: isReadableText(text) ? text : "",
    pageCount,
    encrypted: false,
  };
}
