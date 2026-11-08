import { AI_CONTEXT_PREFIX, AI_SYSTEM_PROMPT } from "@/data/prompts/ai-system-prompt";
import { buildNodeFileUri, ensureNodeMarkdown } from "@/services/file/fileManager";
import type {
  AiDraft,
  ChatMessage,
  GraphEdge,
  GraphNode,
  Schedule,
  Snapshot,
  UserProfile,
} from "@/types/models";
import { formatDateTime, isDateKey, isTimeValue } from "@/utils/date";
import { positionForNewNode } from "@/utils/graphLayout";
import { makeId } from "@/utils/id";
import {
  callDeepSeek,
  type DeepSeekCompletion,
  type DeepSeekMessage,
  type DeepSeekToolCall,
} from "./deepseek";
import { KOSAA_TOOLS } from "./tools";

export interface AgentResult {
  reply: string;
  draft: AiDraft | null;
}

interface ToolResult {
  ok: boolean;
  message?: string;
  error?: string;
  id?: string;
  [key: string]: unknown;
}

function createDraft(snapshot: Snapshot): AiDraft {
  return {
    nodes: snapshot.nodes.map((node) => ({ ...node })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
    schedules: snapshot.schedules.map((schedule) => ({ ...schedule })),
    summaries: [],
    changedScreens: [],
    changedNodeIds: [],
    changedScheduleIds: [],
  };
}

function markScreen(draft: AiDraft, screen: "graph" | "calendar"): void {
  if (!draft.changedScreens.includes(screen)) draft.changedScreens.push(screen);
}

const TYPE_LABELS: Record<string, string> = {
  md: "catatan",
  image: "gambar",
  pdf: "pdf",
  file: "file",
};

function buildContext(snapshot: Snapshot): string {
  // Duplicate titles are flagged so the model picks by type instead of asking
  // the user "which one?" every time.
  const titleCount = new Map<string, number>();
  for (const node of snapshot.nodes) {
    const key = node.title.trim().toLowerCase();
    titleCount.set(key, (titleCount.get(key) ?? 0) + 1);
  }

  // Most recently touched notes first: those are what the conversation is about.
  const ordered = [...snapshot.nodes].sort((a, b) => b.updatedAt - a.updatedAt);
  const shownNodes = ordered.slice(0, 120);
  const hiddenNodes = snapshot.nodes.length - shownNodes.length;

  const nodeLines = shownNodes.map((node) => {
    const parentNode = node.parentId
      ? snapshot.nodes.find((item) => item.id === node.parentId)
      : undefined;
    const parent = parentNode ? parentNode.title : node.parentId ?? "utama";
    const duplicates = (titleCount.get(node.title.trim().toLowerCase()) ?? 0) > 1;
    return (
      "- id=" +
      node.id +
      ' | judul="' +
      node.title +
      '"' +
      " | tipe=" +
      node.type +
      " (" +
      (TYPE_LABELS[node.type] ?? node.type) +
      ")" +
      (node.mimeType ? " | mime=" + node.mimeType : "") +
      " | induk=" +
      parent +
      (node.parentId ? "" : " (node utama)") +
      (duplicates ? " | judul duplikat" : "")
    );
  });

  const scheduleLines = snapshot.schedules.slice(0, 80).map(
    (schedule) =>
      "- " +
      schedule.id +
      " | " +
      schedule.title +
      " | " +
      schedule.date +
      (schedule.end_date && schedule.end_date !== schedule.date ? " s/d " + schedule.end_date : "") +
      " | " +
      (schedule.start_time || "-") +
      (schedule.end_time ? "–" + schedule.end_time : "") +
      (schedule.is_completed ? " | selesai" : ""),
  );

  return [
    AI_CONTEXT_PREFIX + " (hanya data ini yang kamu tahu):",
    "Waktu sekarang: " + formatDateTime(Date.now()),
    "PETUNJUK: pakai id apa adanya dan jangan pernah meminta id ke pengguna. " +
      '\"gambar\" berarti tipe=image, \"pdf\" berarti tipe=pdf. ' +
      "Jika judul duplikat, pilih berdasarkan tipe/mime atau induk, bukan dengan bertanya.",
    "",
    "CATATAN (" + snapshot.nodes.length + "):",
    nodeLines.length > 0
      ? nodeLines.join("\n") +
        (hiddenNodes > 0 ? "\n(+" + hiddenNodes + " catatan lama tidak ditampilkan)" : "")
      : "(kosong)",
    "",
    "JADWAL (" + snapshot.schedules.length + "):",
    scheduleLines.length > 0 ? scheduleLines.join("\n") : "(kosong)",
  ].join("\n");
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function findParent(draft: AiDraft, parentId: string): GraphNode | null {
  const parent = draft.nodes.find((node) => node.id === parentId);
  if (!parent) return null;
  if (parent.parentId) return null;
  return parent;
}

function executeCreateNode(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const title = asString(args.title);
  const content = typeof args.content === "string" ? args.content : "";
  if (!title) return { ok: false, error: "Judul catatan wajib diisi." };

  const parentId = asString(args.parent_id) ?? null;
  if (parentId) {
    const parent = findParent(draft, parentId);
    if (!parent) return { ok: false, error: "Node induk tidak ditemukan atau bukan node utama." };
  }

  const id = makeId("n");
  const now = Date.now();
  const position = positionForNewNode(draft.nodes, parentId);
  const node: GraphNode = {
    id,
    title,
    type: "md",
    filePath: buildNodeFileUri(id, "md"),
    mimeType: "",
    parentId,
    x: position.x,
    y: position.y,
    content,
    createdAt: now,
    updatedAt: now,
  };

  draft.nodes.push(node);
  draft.changedNodeIds.push(id);
  draft.summaries.push(
    "Membuat catatan \"" +
      title +
      "\"" +
      (parentId ? " di bawah " + (findParent(draft, parentId)?.title ?? "node utama") : "") +
      ".",
  );
  markScreen(draft, "graph");
  return { ok: true, message: "Catatan dibuat.", id };
}

function executeUpdateNode(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const id = asString(args.id);
  if (!id) return { ok: false, error: "ID catatan wajib diisi." };
  const node = draft.nodes.find((item) => item.id === id);
  if (!node) return { ok: false, error: "Catatan dengan ID tersebut tidak ditemukan." };

  const title = asString(args.title);
  const content = typeof args.content === "string" ? args.content : undefined;
  const hasParentArg = Object.prototype.hasOwnProperty.call(args, "parent_id");
  let nextParent: string | null = node.parentId;

  if (hasParentArg) {
    const rawParent = args.parent_id;
    nextParent = typeof rawParent === "string" && rawParent.trim() ? rawParent.trim() : null;
    if (nextParent) {
      if (nextParent === id) return { ok: false, error: "Catatan tidak bisa menjadi induk dirinya sendiri." };
      if (draft.nodes.some((item) => item.parentId === id)) {
        return { ok: false, error: "Catatan yang punya subnode tidak bisa dijadikan subnode." };
      }
      if (!findParent(draft, nextParent)) {
        return { ok: false, error: "Node induk tidak ditemukan atau bukan node utama." };
      }
    }
  }

  if (!title && content === undefined && !hasParentArg) {
    return { ok: false, error: "Tidak ada judul, isi, atau induk yang diubah." };
  }

  if (title) node.title = title;
  if (content !== undefined) node.content = content;
  if (hasParentArg) node.parentId = nextParent;
  node.updatedAt = Date.now();
  draft.changedNodeIds.push(id);
  draft.summaries.push('Memperbarui catatan "' + node.title + '".');
  markScreen(draft, "graph");
  return { ok: true, message: "Catatan diperbarui.", id };
}

function executeDeleteNode(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const id = asString(args.id);
  if (!id) return { ok: false, error: "ID catatan wajib diisi." };
  const index = draft.nodes.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, error: "Catatan dengan ID tersebut tidak ditemukan." };

  const [node] = draft.nodes.splice(index, 1);
  const children = draft.nodes.filter((item) => item.parentId === id);
  for (const child of children) {
    child.parentId = null;
    draft.changedNodeIds.push(child.id);
  }
  draft.edges = draft.edges.filter((edge) => edge.source_id !== id && edge.target_id !== id);
  draft.changedNodeIds.push(id);
  draft.summaries.push('Menghapus catatan "' + node.title + '" dari graph.');
  if (children.length > 0) {
    draft.summaries.push(children.length + " subnode dipromosikan menjadi node utama.");
  }
  markScreen(draft, "graph");
  return { ok: true, message: "Catatan dihapus dari graph.", id };
}

function executeCreateLink(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const sourceId = asString(args.source_id);
  const targetId = asString(args.target_id);
  if (!sourceId || !targetId) return { ok: false, error: "source_id dan target_id wajib diisi." };
  if (sourceId === targetId) return { ok: false, error: "Tidak bisa menautkan catatan ke dirinya sendiri." };

  const source = draft.nodes.find((node) => node.id === sourceId);
  const target = draft.nodes.find((node) => node.id === targetId);
  if (!source || !target) return { ok: false, error: "Salah satu catatan tidak ditemukan." };

  const exists = draft.edges.some(
    (edge) =>
      (edge.source_id === sourceId && edge.target_id === targetId) ||
      (edge.source_id === targetId && edge.target_id === sourceId),
  );
  if (exists) return { ok: false, error: "Kedua catatan sudah tertaut." };

  const edge: GraphEdge = {
    id: makeId("e"),
    source_id: sourceId,
    target_id: targetId,
    createdAt: Date.now(),
  };
  draft.edges.push(edge);
  draft.summaries.push('Menautkan "' + source.title + '" ke "' + target.title + '".');
  markScreen(draft, "graph");
  return { ok: true, message: "Tautan dibuat.", id: edge.id };
}

async function executeReadNode(draft: AiDraft, args: Record<string, unknown>): Promise<ToolResult> {
  const id = asString(args.id);
  if (!id) return { ok: false, error: "ID catatan wajib diisi." };
  const node = draft.nodes.find((item) => item.id === id);
  if (!node) return { ok: false, error: "Catatan dengan ID tersebut tidak ditemukan." };

  const result = await ensureNodeMarkdown(node);
  const parent = node.parentId
    ? draft.nodes.find((item) => item.id === node.parentId)?.title ?? node.parentId
    : "utama";
  const content = result.content;
  const limit = 6000;

  return {
    ok: true,
    message: result.created
      ? "File .md belum ada, jadi sudah dibuat. Isinya masih kosong."
      : "Catatan dibaca.",
    id: node.id,
    title: node.title,
    type: node.type,
    parent,
    attachment: node.type === "md" ? null : node.filePath,
    content: content.slice(0, limit),
    truncated: content.length > limit,
  };
}

function executeCreateSchedule(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const title = asString(args.title);
  const date = asString(args.date);
  const endDateRaw = typeof args.end_date === "string" ? args.end_date.trim() : "";
  const startTime = asString(args.start_time) ?? "";
  const endTime = asString(args.end_time) ?? "";

  if (!title) return { ok: false, error: "Judul jadwal wajib diisi." };
  if (!date || !isDateKey(date)) return { ok: false, error: "Tanggal harus berformat YYYY-MM-DD." };
  if (endDateRaw && (!isDateKey(endDateRaw) || endDateRaw < date)) {
    return { ok: false, error: "Tanggal selesai tidak valid atau sebelum tanggal mulai." };
  }
  if (startTime && !isTimeValue(startTime)) return { ok: false, error: "Jam mulai harus berformat HH:mm." };
  if (endTime && !isTimeValue(endTime)) return { ok: false, error: "Jam selesai harus berformat HH:mm." };

  const schedule: Schedule = {
    id: makeId("s"),
    title,
    date,
    end_date: endDateRaw,
    start_time: startTime,
    end_time: endTime,
    is_completed: 0,
    createdAt: Date.now(),
  };
  draft.schedules.push(schedule);
  draft.schedules.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  draft.changedScheduleIds.push(schedule.id);
  draft.summaries.push('Menambahkan jadwal "' + title + '" pada ' + date + ".");
  markScreen(draft, "calendar");
  return { ok: true, message: "Jadwal dibuat.", id: schedule.id };
}

function executeUpdateSchedule(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const id = asString(args.id);
  if (!id) return { ok: false, error: "ID jadwal wajib diisi." };
  const schedule = draft.schedules.find((item) => item.id === id);
  if (!schedule) return { ok: false, error: "Jadwal dengan ID tersebut tidak ditemukan." };

  const title = asString(args.title);
  const date = asString(args.date);
  const endDate = typeof args.end_date === "string" ? args.end_date.trim() : undefined;
  const startTime = asString(args.start_time);
  const endTime = asString(args.end_time);
  const isCompleted = args.is_completed;

  if (date && !isDateKey(date)) return { ok: false, error: "Tanggal harus berformat YYYY-MM-DD." };
  if (endDate && (!isDateKey(endDate) || (date ?? schedule.date) > endDate)) {
    return { ok: false, error: "Tanggal selesai tidak valid atau sebelum tanggal mulai." };
  }
  if (startTime && !isTimeValue(startTime)) return { ok: false, error: "Jam mulai harus berformat HH:mm." };
  if (endTime && !isTimeValue(endTime)) return { ok: false, error: "Jam selesai harus berformat HH:mm." };

  if (title) schedule.title = title;
  if (date) schedule.date = date;
  if (endDate !== undefined) schedule.end_date = endDate;
  if (schedule.end_date && schedule.end_date < schedule.date) schedule.end_date = "";
  if (args.start_time !== undefined) schedule.start_time = startTime ?? "";
  if (args.end_time !== undefined) schedule.end_time = endTime ?? "";
  if (typeof isCompleted === "boolean") schedule.is_completed = isCompleted ? 1 : 0;

  draft.schedules.sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
  draft.changedScheduleIds.push(schedule.id);
  draft.summaries.push('Memperbarui jadwal "' + schedule.title + '".');
  markScreen(draft, "calendar");
  return { ok: true, message: "Jadwal diperbarui.", id };
}

function executeDeleteSchedule(draft: AiDraft, args: Record<string, unknown>): ToolResult {
  const id = asString(args.id);
  if (!id) return { ok: false, error: "ID jadwal wajib diisi." };
  const index = draft.schedules.findIndex((item) => item.id === id);
  if (index < 0) return { ok: false, error: "Jadwal dengan ID tersebut tidak ditemukan." };

  const [schedule] = draft.schedules.splice(index, 1);
  draft.changedScheduleIds.push(id);
  draft.summaries.push('Menghapus jadwal "' + schedule.title + '".');
  markScreen(draft, "calendar");
  return { ok: true, message: "Jadwal dihapus.", id };
}

async function executeToolCall(draft: AiDraft, call: DeepSeekToolCall): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(call.function.arguments || "{}") as unknown;
    if (parsed && typeof parsed === "object") args = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "Argumen tool bukan JSON yang valid." };
  }

  switch (call.function.name) {
    case "create_node":
      return executeCreateNode(draft, args);
    case "update_node":
      return executeUpdateNode(draft, args);
    case "delete_node":
      return executeDeleteNode(draft, args);
    case "create_link":
      return executeCreateLink(draft, args);
    case "read_node":
      return executeReadNode(draft, args);
    case "create_schedule":
      return executeCreateSchedule(draft, args);
    case "update_schedule":
      return executeUpdateSchedule(draft, args);
    case "delete_schedule":
      return executeDeleteSchedule(draft, args);
    default:
      return { ok: false, error: "Tool tidak dikenal: " + call.function.name };
  }
}

function fallbackReply(draft: AiDraft): string {
  if (draft.summaries.length === 0) return "Aku sudah membaca catatannya.";
  return "Aku sudah menyiapkan " + draft.summaries.length + " perubahan. Periksa lalu setujui.";
}

/**
 * Verbs that mean "change my data". Colloquial forms (bikin, jadii n, hapusin,
 * ingetin, ...) matter: users type them all the time and a missed verb used to
 * disable the tool enforcement for the whole turn.
 */
const MUTATION_PATTERN =
  /\b(buat|buatkan|buatin|bikin|bikinin|tambah|tambahkan|tambahin|simpan|simpen|catat|catet|tulis|tuliskan|hapus|hapusin|hilangkan|ilangin|hilangin|buang|ubah|ubahin|edit|ganti|gantiin|perbarui|update|jadwalkan|jadwalin|ingatkan|ingetin|tandai|tandain|selesaikan|selesaiin|tautkan|tautin|hubungkan|hubungin|pindahkan|pindahin|jadikan|jadiin|promosikan)\b/i;

const QUESTION_START = /^(apa|apakah|siapa|mana|yang mana|kapan|berapa|gimana|bagaimana|kok|kenapa|mengapa)\b/i;

function isQuestionLike(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return trimmed.endsWith("?") || QUESTION_START.test(trimmed);
}

/** Sentences the model must never use when no tool actually ran. */
const CLAIMS_CHANGE_PATTERN =
  /(menunggu persetujuan|sudah (dibuat|dihapus|ditambah|ditambahkan|disimpan|diperbarui|diubah|dijadwalkan|ditautkan|dipindah)|telah (dibuat|dihapus|ditambah|ditambahkan|disimpan|diperbarui|diubah|dijadwalkan|ditautkan)|berhasil (dibuat|dihapus|ditambahkan|disimpan|diperbarui|diubah))/i;

const NO_ACTION_REPLY =
  "Aku belum mengubah apa pun. Sebutkan lagi nama catatan atau jadwal yang dimaksud, ya.";

const TOOL_NUDGE =
  "Permintaan pengguna terakhir adalah perubahan data. Panggil tool yang tepat SEKARANG " +
  "dengan ID dari konteks. Jangan menjawab dengan teks dan jangan mengarang hasil.";

interface ConversationTail {
  lastUser: string;
  lastAssistant: string;
  /** User message the last assistant reply was answering. */
  previousUser: string;
  /** True when the assistant message directly answers the last user message. */
  adjacent: boolean;
}

function readConversationTail(history: ChatMessage[]): ConversationTail {
  let lastUser = "";
  let lastUserIndex = -1;
  let lastAssistant = "";
  let lastAssistantIndex = -1;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (lastUserIndex < 0 && message.role === "user") {
      lastUser = message.content;
      lastUserIndex = index;
    }
    if (lastAssistantIndex < 0 && message.role === "assistant") {
      lastAssistant = message.content;
      lastAssistantIndex = index;
    }
    if (lastUserIndex >= 0 && lastAssistantIndex >= 0) break;
  }

  let previousUser = "";
  for (let index = lastAssistantIndex - 1; index >= 0; index -= 1) {
    if (history[index].role === "user") {
      previousUser = history[index].content;
      break;
    }
  }

  return {
    lastUser,
    lastAssistant,
    previousUser,
    adjacent: lastAssistantIndex >= 0 && lastAssistantIndex === lastUserIndex - 1,
  };
}

/**
 * The model sometimes answers a data-change request with plain text instead of
 * calling a tool (and then claims the change happened). We nudge once, then
 * force a tool call with tool_choice="required" so the UI can stage a draft.
 */
export async function runKosaaAgent(options: {
  apiKey: string;
  model: string;
  history: ChatMessage[];
  snapshot: Snapshot;
  profile: UserProfile;
}): Promise<AgentResult> {
  const { apiKey, model, history, snapshot, profile } = options;
  if (!profile.agentEnabled) {
    throw new Error("Agent sedang dinonaktifkan. Aktifkan lewat Profil & Personality.");
  }

  const tail = readConversationTail(history);
  // Only an assistant question that directly precedes this message counts, so a
  // stale question from many turns ago cannot hijack a fresh request.
  const awaitingAnswer = tail.adjacent && tail.lastAssistant.includes("?");
  // A short answer like "dua-duanya" carries no verb of its own: keep enforcing
  // the task the assistant asked its question about.
  const pendingTask =
    awaitingAnswer && MUTATION_PATTERN.test(tail.previousUser) ? tail.previousUser : "";
  const wantsChange =
    Boolean(pendingTask) || (MUTATION_PATTERN.test(tail.lastUser) && !isQuestionLike(tail.lastUser));
  const draft = createDraft(snapshot);

  const messages: DeepSeekMessage[] = [
    { role: "system", content: AI_SYSTEM_PROMPT },
    {
      role: "system",
      content:
        "Profil pengguna: " +
        profile.name +
        ". Personality yang diinginkan: " +
        profile.personality +
        ". Sapa pengguna dengan namanya bila relevan.",
    },
    {
      role: "system",
      content:
        "Gunakan read_node untuk membaca isi .md saat pengguna bertanya tentang isi catatan. " +
        "Jika .md belum ada, tool akan membuatkannya. " +
        "Setelah memanggil tool perubahan, data belum tersimpan; jangan bilang sudah tersimpan, " +
        "cukup jelaskan bahwa perubahan menunggu persetujuan. " +
        "Jangan pernah mengaku membuat, mengubah, atau menghapus data bila tool tidak dipanggil. " +
        "Semua id ada di konteks: jangan pernah meminta id ke pengguna. " +
        "Jika beberapa catatan mirip, pilih berdasarkan tipe/mime/induk lalu sebut judulnya. " +
        'Jika pengguna menjawab singkat seperti "dua-duanya" atau "semua", terapkan ke semua kandidat.',
    },
    { role: "system", content: buildContext(snapshot) },
    ...(pendingTask
      ? [
          {
            role: "system" as const,
            content:
              'Tugas tertunda: "' +
              pendingTask +
              '". Pengguna baru saja menjawab pertanyaanmu: "' +
              tail.lastUser +
              '". Lanjutkan tugas tertunda itu sekarang: pilih kandidat paling cocok ' +
              "berdasarkan tipe/mime, lalu panggil tool. Jangan mengulang pertanyaan.",
          },
        ]
      : []),
    ...history.slice(-20).map<DeepSeekMessage>((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  let reply = "";
  let toolCallsSeen = 0;
  let nudged = false;
  let round = 0;

  while (round < 4) {
    // Escalate on the retry round: the model already answered a change request
    // with text, so make the tool call mandatory.
    const forceTool = nudged && toolCallsSeen === 0;
    const request = {
      apiKey,
      model,
      messages,
      tools: KOSAA_TOOLS as unknown[],
      temperature: 0.3,
      maxTokens: round === 0 ? 1400 : 700,
      thinking: false,
    };

    let completion: DeepSeekCompletion;
    try {
      completion = await callDeepSeek({
        ...request,
        toolChoice: forceTool ? "required" : "auto",
      });
    } catch (error) {
      if (!forceTool) throw error;
      // Some deployments reject tool_choice="required"; fall back to auto.
      completion = await callDeepSeek({ ...request, toolChoice: "auto" });
    }

    if (completion.toolCalls.length === 0) {
      reply = completion.content;
      if (wantsChange && toolCallsSeen === 0 && !nudged) {
        nudged = true;
        messages.push({ role: "system", content: TOOL_NUDGE });
        round += 1;
        continue;
      }
      break;
    }

    toolCallsSeen += completion.toolCalls.length;
    // DeepSeek wants the assistant tool_calls echoed before the tool results.
    messages.push({
      role: "assistant",
      content: completion.content,
      tool_calls: completion.toolCalls,
    });

    for (let index = 0; index < completion.toolCalls.length; index += 1) {
      const call = completion.toolCalls[index];
      let result: ToolResult;
      try {
        result = await executeToolCall(draft, call);
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : "Tool gagal dijalankan.",
        };
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id || "call_" + round + "_" + index,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }

    reply = completion.content;
    round += 1;
  }

  if (!reply.trim()) reply = fallbackReply(draft);

  const changed = draft.changedScreens.length > 0;
  // Never let a hallucinated "sudah dihapus / menunggu persetujuan" reach the
  // user when no tool actually produced a draft. A clarifying question is kept.
  if (!changed) {
    const claimsChange = CLAIMS_CHANGE_PATTERN.test(reply);
    const asksBack = reply.trim().endsWith("?");
    const nothingRan = toolCallsSeen === 0;
    // Keep a genuine answer (e.g. after read_node) but never a change claim.
    if (claimsChange || (wantsChange && nothingRan && !asksBack)) {
      reply = NO_ACTION_REPLY;
    }
  }

  return {
    reply: reply.trim(),
    draft: changed ? draft : null,
  };
}
