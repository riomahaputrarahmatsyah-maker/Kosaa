import { create } from "zustand";

import { fetchSchedules, deleteScheduleRow, insertSchedule, updateScheduleRow } from "@/services/db/calendar_queries";
import {
  deleteEdgeRow,
  deleteNodeRow,
  fetchGraph,
  insertEdge,
  insertNode,
  promoteChildrenRow,
  updateNodePositionRow,
  updateNodeRow,
} from "@/services/db/graph_queries";
import { initDatabase } from "@/services/db/sqlite";
import { replaceBrain } from "@/services/db/sync";
import {
  buildNodeFileUri,
  clearHistoryFile,
  deleteNodeFiles,
  ensureNodeMarkdown,
  readHistoryFile,
  saveHistoryFile,
  storeAttachment,
  writeNodeContent,
} from "@/services/file/fileManager";
import { DEFAULT_PROFILE, getProfile, saveProfile } from "@/services/settings/profile";
import type {
  AiDraft,
  ChangedScreen,
  ChatMessage,
  ChatRole,
  GraphEdge,
  GraphNode,
  NodeType,
  PendingChange,
  Schedule,
  UserProfile,
} from "@/types/models";
import { isDateKey, isTimeValue } from "@/utils/date";
import { positionForNewNode } from "@/utils/graphLayout";
import { makeId } from "@/utils/id";
import { attachmentTitle } from "@/utils/text";

export type NoticeTone = "info" | "success" | "error";

export interface Notice {
  id: number;
  message: string;
  tone: NoticeTone;
}

export interface AttachmentInput {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface AttachmentCreation {
  node: GraphNode;
  /** PDF → .md conversion is not available yet (coming soon). */
  conversionPending: boolean;
}

interface AppStore {
  hydrated: boolean;
  bootError: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  schedules: Schedule[];
  messages: ChatMessage[];
  pending: PendingChange | null;
  drawerOpen: boolean;
  notice: Notice | null;
  focusDate: string | null;
  profile: UserProfile;

  initialize: () => Promise<void>;
  setDrawerOpen: (open: boolean) => void;
  showNotice: (message: string, tone?: NoticeTone) => void;
  dismissNotice: () => void;
  consumeFocusDate: () => void;
  setProfile: (profile: UserProfile) => Promise<void>;

  createNote: (title: string, content: string, parentId: string | null) => Promise<GraphNode>;
  createNoteWithAttachment: (
    title: string,
    content: string,
    parentId: string | null,
    attachment: AttachmentInput,
  ) => Promise<AttachmentCreation>;
  updateNote: (
    id: string,
    title: string,
    content: string,
    parentId?: string | null,
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  moveNode: (id: string, x: number, y: number) => Promise<void>;
  linkNodes: (sourceId: string, targetId: string) => Promise<boolean>;
  unlinkEdge: (edgeId: string) => Promise<void>;
  getNodeContent: (id: string) => Promise<string>;

  addMessage: (role: ChatRole, content: string) => Promise<ChatMessage>;
  clearChat: () => Promise<void>;

  stageAiChange: (draft: AiDraft) => void;
  approvePending: () => Promise<void>;
  cancelPending: () => void;

  createSchedule: (input: {
    title: string;
    date: string;
    end_date: string;
    start_time: string;
    end_time: string;
  }) => Promise<Schedule>;
  updateSchedule: (schedule: Schedule) => Promise<void>;
  toggleSchedule: (id: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
}

let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let bootPromise: Promise<void> | null = null;

/** Body written to the companion .md while PDF parsing is not available yet. */
const PDF_COMING_SOON_NOTE = [
  "> Konversi PDF ke Markdown: **coming soon**.",
  ">",
  "> Lampiran PDF tetap tersimpan di perangkat dan bisa dibuka dari catatan ini.",
].join("\n");

function sortSchedules(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Terjadi kesalahan tak terduga.";
}

function resolveParent(nodes: GraphNode[], parentId: string | null): string | null {
  if (!parentId) return null;
  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) throw new Error("Node induk tidak ditemukan.");
  if (parent.parentId) throw new Error("Subnode hanya bisa berada di bawah node utama.");
  return parent.id;
}

function normalizeEndDate(date: string, endDate: string): string {
  if (!endDate.trim()) return "";
  if (!isDateKey(endDate)) throw new Error("Tanggal selesai tidak valid.");
  if (endDate < date) throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  return endDate;
}

export const useAppStore = create<AppStore>((set, get) => ({
  hydrated: false,
  bootError: null,
  nodes: [],
  edges: [],
  schedules: [],
  messages: [],
  pending: null,
  drawerOpen: false,
  notice: null,
  focusDate: null,
  profile: DEFAULT_PROFILE,

  initialize: async () => {
    if (get().hydrated) return;
    if (!bootPromise) {
      bootPromise = (async () => {
        set({ bootError: null });
        try {
          await initDatabase();
          const [graph, schedules, messages, profile] = await Promise.all([
            fetchGraph(),
            fetchSchedules(),
            readHistoryFile(),
            getProfile(),
          ]);
          set({
            nodes: graph.nodes,
            edges: graph.edges,
            schedules,
            messages,
            profile,
            hydrated: true,
          });
        } catch (error) {
          bootPromise = null;
          set({ bootError: errorMessage(error) });
        }
      })();
    }
    await bootPromise;
  },

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  showNotice: (message, tone = "info") => {
    if (noticeTimer) clearTimeout(noticeTimer);
    const notice: Notice = { id: Date.now(), message, tone };
    set({ notice });
    noticeTimer = setTimeout(() => {
      if (get().notice?.id === notice.id) set({ notice: null });
    }, 3800);
  },

  dismissNotice: () => {
    if (noticeTimer) clearTimeout(noticeTimer);
    set({ notice: null });
  },

  consumeFocusDate: () => set({ focusDate: null }),

  setProfile: async (profile) => {
    await saveProfile(profile);
    set({ profile: { ...profile } });
  },

  createNote: async (title, content, parentId) => {
    const parent = resolveParent(get().nodes, parentId);
    const now = Date.now();
    const id = makeId("n");
    const position = positionForNewNode(get().nodes, parent);
    const node: GraphNode = {
      id,
      title: title.trim() || "Catatan baru",
      type: "md",
      filePath: buildNodeFileUri(id, "md"),
      mimeType: "",
      parentId: parent,
      x: position.x,
      y: position.y,
      content,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await writeNodeContent(node, content);
      await insertNode(node);
    } catch (error) {
      deleteNodeFiles(node);
      throw new Error("Gagal menyimpan catatan: " + errorMessage(error));
    }

    set((state) => ({ nodes: [...state.nodes, node] }));
    return node;
  },

  createNoteWithAttachment: async (title, content, parentId, attachment) => {
    const parent = resolveParent(get().nodes, parentId);
    const now = Date.now();
    const id = makeId("n");
    const position = positionForNewNode(get().nodes, parent);
    const stored = await storeAttachment(id, attachment.uri, attachment.name, attachment.mimeType);

    const typed = content.trim();
    const body = [typed, stored.type === "pdf" ? PDF_COMING_SOON_NOTE : ""]
      .filter(Boolean)
      .join("\n\n");
    // Hash-like picker names are replaced so the agent never mistakes a title
    // for an ID (or the other way around).
    const fallbackTitle = attachmentTitle(attachment.name, stored.type);

    const node: GraphNode = {
      id,
      title: title.trim() || fallbackTitle || "Lampiran baru",
      type: stored.type,
      filePath: stored.filePath,
      mimeType: stored.mimeType,
      parentId: parent,
      x: position.x,
      y: position.y,
      content: body,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await writeNodeContent(node, body);
      await insertNode(node);
    } catch (error) {
      deleteNodeFiles(node);
      throw new Error("Gagal menyimpan lampiran: " + errorMessage(error));
    }

    set((state) => ({ nodes: [...state.nodes, node] }));
    return { node, conversionPending: stored.conversionPending };
  },

  updateNote: async (id, title, content, parentId) => {
    const nodes = get().nodes;
    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    const nextParent = parentId === undefined ? node.parentId : parentId;
    if (nextParent) {
      const hasChildren = nodes.some((item) => item.parentId === id);
      if (hasChildren) {
        throw new Error("Catatan yang punya subnode tidak bisa dijadikan subnode.");
      }
      if (nextParent === id) throw new Error("Catatan tidak bisa menjadi induk dirinya sendiri.");
      resolveParent(nodes, nextParent);
    }

    const updated: GraphNode = {
      ...node,
      title: title.trim() || node.title,
      content,
      parentId: nextParent,
      updatedAt: Date.now(),
    };
    await writeNodeContent(updated, content);
    await updateNodeRow(updated);
    set((state) => ({
      nodes: state.nodes.map((item) => (item.id === id ? updated : item)),
    }));
  },

  deleteNote: async (id) => {
    const node = get().nodes.find((item) => item.id === id);
    if (!node) return;

    try {
      await promoteChildrenRow(id);
      await deleteNodeRow(id);
    } catch (error) {
      throw new Error("Gagal menghapus catatan: " + errorMessage(error));
    }

    set((state) => ({
      nodes: state.nodes
        .filter((item) => item.id !== id)
        .map((item) => (item.parentId === id ? { ...item, parentId: null } : item)),
      edges: state.edges.filter((edge) => edge.source_id !== id && edge.target_id !== id),
    }));
    get().showNotice("Catatan dihapus dari graph. File tetap tersimpan di perangkat.", "info");
  },

  moveNode: async (id, x, y) => {
    const now = Date.now();
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, x, y, updatedAt: now } : node,
      ),
    }));
    try {
      await updateNodePositionRow(id, x, y);
    } catch (error) {
      get().showNotice("Posisi catatan gagal disimpan: " + errorMessage(error), "error");
    }
  },

  linkNodes: async (sourceId, targetId) => {
    if (sourceId === targetId) {
      get().showNotice("Tidak bisa menautkan catatan ke dirinya sendiri.", "error");
      return false;
    }
    const exists = get().edges.some(
      (edge) =>
        (edge.source_id === sourceId && edge.target_id === targetId) ||
        (edge.source_id === targetId && edge.target_id === sourceId),
    );
    if (exists) {
      get().showNotice("Kedua catatan sudah tertaut.", "info");
      return false;
    }
    const edge: GraphEdge = {
      id: makeId("e"),
      source_id: sourceId,
      target_id: targetId,
      createdAt: Date.now(),
    };
    try {
      await insertEdge(edge);
      set((state) => ({ edges: [...state.edges, edge] }));
      get().showNotice("Tautan dibuat.", "success");
      return true;
    } catch (error) {
      get().showNotice("Gagal menautkan catatan: " + errorMessage(error), "error");
      return false;
    }
  },

  unlinkEdge: async (edgeId) => {
    try {
      await deleteEdgeRow(edgeId);
      set((state) => ({ edges: state.edges.filter((edge) => edge.id !== edgeId) }));
    } catch (error) {
      get().showNotice("Gagal menghapus tautan: " + errorMessage(error), "error");
    }
  },

  getNodeContent: async (id) => {
    const node = get().nodes.find((item) => item.id === id);
    if (!node) return "";
    if (typeof node.content === "string") return node.content;
    const result = await ensureNodeMarkdown(node);
    set((state) => ({
      nodes: state.nodes.map((item) => (item.id === id ? { ...item, content: result.content } : item)),
    }));
    return result.content;
  },

  addMessage: async (role, content) => {
    const message: ChatMessage = {
      id: makeId("msg"),
      role,
      content: content.trim(),
      createdAt: Date.now(),
    };
    const next = [...get().messages, message];
    set({ messages: next });
    try {
      await saveHistoryFile(next);
    } catch (error) {
      get().showNotice("Riwayat chat gagal disimpan: " + errorMessage(error), "error");
    }
    return message;
  },

  clearChat: async () => {
    set({ messages: [] });
    try {
      await clearHistoryFile();
      get().showNotice("Riwayat chat dibersihkan.", "success");
    } catch (error) {
      get().showNotice("Gagal membersihkan riwayat: " + errorMessage(error), "error");
    }
  },

  stageAiChange: (draft) => {
    const snapshot = {
      nodes: get().nodes.map((node) => ({ ...node })),
      edges: get().edges.map((edge) => ({ ...edge })),
      schedules: get().schedules.map((schedule) => ({ ...schedule })),
    };
    const summary = draft.summaries.length > 0 ? draft.summaries.join("\n") : "Perubahan dari Kosaa.";
    const changedSchedule = draft.schedules.find((schedule) => {
      const previous = snapshot.schedules.find((item) => item.id === schedule.id);
      return !previous || previous.date !== schedule.date || previous.end_date !== schedule.end_date;
    });

    set({
      pending: {
        snapshot,
        summary,
        changedScreens: draft.changedScreens as ChangedScreen[],
        changedNodeIds: draft.changedNodeIds,
        changedScheduleIds: draft.changedScheduleIds,
      },
      nodes: draft.nodes,
      edges: draft.edges,
      schedules: draft.schedules,
      focusDate: changedSchedule?.date ?? null,
    });
  },

  approvePending: async () => {
    const pending = get().pending;
    if (!pending) return;

    const nodes = get().nodes.map((node) => ({ ...node }));
    const edges = get().edges.map((edge) => ({ ...edge }));
    const schedules = get().schedules.map((schedule) => ({ ...schedule }));

    const backups: Array<{ node: GraphNode; content: string | null }> = [];

    try {
      for (const node of nodes) {
        if (typeof node.content !== "string") continue;
        const previous = pending.snapshot.nodes.find((item) => item.id === node.id);
        backups.push({
          node,
          content: previous ? await ensureNodeMarkdown(previous).then((result) => result.content) : null,
        });
        await writeNodeContent(node, node.content);
      }

      await replaceBrain(nodes, edges, schedules);

      set({ pending: null });
      get().showNotice("Perubahan Kosaa disimpan.", "success");
    } catch (error) {
      for (const backup of backups) {
        try {
          if (backup.content === null) {
            deleteNodeFiles(backup.node);
          } else {
            await writeNodeContent(backup.node, backup.content);
          }
        } catch {
          // Best-effort file rollback; the state snapshot remains authoritative.
        }
      }
      try {
        await replaceBrain(pending.snapshot.nodes, pending.snapshot.edges, pending.snapshot.schedules);
      } catch {
        // The original transaction either never committed or was rolled back.
      }
      set({
        pending: null,
        nodes: pending.snapshot.nodes,
        edges: pending.snapshot.edges,
        schedules: pending.snapshot.schedules,
      });
      get().showNotice("Gagal menyimpan perubahan. Data dikembalikan. " + errorMessage(error), "error");
    }
  },

  cancelPending: () => {
    const pending = get().pending;
    if (!pending) return;
    set({
      pending: null,
      nodes: pending.snapshot.nodes,
      edges: pending.snapshot.edges,
      schedules: pending.snapshot.schedules,
      focusDate: null,
    });
    get().showNotice("Perubahan dibatalkan.", "info");
  },

  createSchedule: async (input) => {
    const title = input.title.trim();
    if (!title) throw new Error("Nama kegiatan wajib diisi.");
    if (!isDateKey(input.date)) throw new Error("Tanggal tidak valid.");
    const endDate = normalizeEndDate(input.date, input.end_date);
    if (input.start_time && !isTimeValue(input.start_time)) throw new Error("Jam mulai tidak valid.");
    if (input.end_time && !isTimeValue(input.end_time)) throw new Error("Jam selesai tidak valid.");

    const schedule: Schedule = {
      id: makeId("s"),
      title,
      date: input.date,
      end_date: endDate,
      start_time: input.start_time,
      end_time: input.end_time,
      is_completed: 0,
      createdAt: Date.now(),
    };
    await insertSchedule(schedule);
    set((state) => ({ schedules: sortSchedules([...state.schedules, schedule]) }));
    return schedule;
  },

  updateSchedule: async (schedule) => {
    const endDate = normalizeEndDate(schedule.date, schedule.end_date);
    const updated = { ...schedule, end_date: endDate };
    await updateScheduleRow(updated);
    set((state) => ({
      schedules: sortSchedules(state.schedules.map((item) => (item.id === schedule.id ? updated : item))),
    }));
  },

  toggleSchedule: async (id) => {
    const schedule = get().schedules.find((item) => item.id === id);
    if (!schedule) return;
    const updated: Schedule = { ...schedule, is_completed: schedule.is_completed ? 0 : 1 };
    await updateScheduleRow(updated);
    set((state) => ({
      schedules: state.schedules.map((item) => (item.id === id ? updated : item)),
    }));
  },

  deleteSchedule: async (id) => {
    await deleteScheduleRow(id);
    set((state) => ({ schedules: state.schedules.filter((item) => item.id !== id) }));
  },
}));
