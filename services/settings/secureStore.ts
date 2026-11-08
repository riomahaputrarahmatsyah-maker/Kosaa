import * as SecureStore from "expo-secure-store";

const API_KEY = "kosaa.deepseek.apiKey";
const MODEL = "kosaa.deepseek.model";

/**
 * Model ids accepted by the DeepSeek API today (api-docs.deepseek.com).
 * The old "deepseek-chat" / "deepseek-reasoner" ids were discontinued on
 * 2026-07-24; requests against them still answer with plain text but silently
 * ignore the tool definitions, which broke every agent action.
 */
export const DEFAULT_MODEL = "deepseek-flash";
export const MODEL_OPTIONS = ["deepseek-flash", "deepseek-v4-pro"] as const;

/** Legacy id → current id, applied whenever a model is read or saved. */
const LEGACY_MODELS: Record<string, string> = {
  "deepseek-chat": "deepseek-flash",
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-reasoner": "deepseek-v4-pro",
  "deepseek-v3": "deepseek-flash",
  "deepseek-v3.2": "deepseek-flash",
};

export function normalizeModel(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return DEFAULT_MODEL;
  return LEGACY_MODELS[trimmed.toLowerCase()] ?? trimmed;
}

const memory = new Map<string, string>();

async function readItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

async function writeItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // The in-memory fallback keeps the current session usable.
  }
}

async function deleteItem(key: string): Promise<void> {
  memory.delete(key);
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignore: nothing to delete or the store is unavailable.
  }
}

export async function getApiKey(): Promise<string> {
  const stored = await readItem(API_KEY);
  if (stored && stored.trim()) return stored.trim();
  return (process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY ?? "").trim();
}

export async function saveApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await deleteItem(API_KEY);
    return;
  }
  await writeItem(API_KEY, trimmed);
}

export function maskApiKey(value: string): string {
  if (!value) return "Belum diatur";
  if (value.length <= 10) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

export async function getModel(): Promise<string> {
  const stored = await readItem(MODEL);
  const model = normalizeModel(stored);
  // Migrate a legacy id once so Settings shows the model that is really used.
  if (model !== stored) await writeItem(MODEL, model);
  return model;
}

export async function saveModel(value: string): Promise<void> {
  await writeItem(MODEL, normalizeModel(value));
}

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  notificationId: string | null;
}

const REMINDER = "kosaa.reminder";

export async function getReminder(): Promise<ReminderSettings> {
  const raw = await readItem(REMINDER);
  if (!raw) return { enabled: false, hour: 20, minute: 0, notificationId: null };
  try {
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: parsed.enabled === true,
      hour: typeof parsed.hour === "number" ? parsed.hour : 20,
      minute: typeof parsed.minute === "number" ? parsed.minute : 0,
      notificationId: typeof parsed.notificationId === "string" ? parsed.notificationId : null,
    };
  } catch {
    return { enabled: false, hour: 20, minute: 0, notificationId: null };
  }
}

export async function saveReminder(settings: ReminderSettings): Promise<void> {
  await writeItem(REMINDER, JSON.stringify(settings));
}
