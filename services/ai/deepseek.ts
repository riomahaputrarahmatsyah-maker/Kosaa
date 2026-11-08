const DEFAULT_BASE_URL = "https://api.deepseek.com";

export const DEEPSEEK_BASE_URL = process.env.EXPO_PUBLIC_DEEPSEEK_BASE_URL ?? DEFAULT_BASE_URL;

export interface DeepSeekToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: DeepSeekToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface DeepSeekCompletion {
  content: string;
  toolCalls: DeepSeekToolCall[];
  finishReason: string;
  /** Chain of thought, only sent by thinking models. Never shown to the user. */
  reasoning: string;
}

export class DeepSeekError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "DeepSeekError";
    this.status = status;
  }
}

function friendlyMessage(status: number, body: string): string {
  if (status === 401) return "API key DeepSeek tidak valid. Periksa kembali di Pengaturan → API & Models.";
  if (status === 402) return "Saldo DeepSeek tidak mencukupi. Isi ulang di platform.deepseek.com lalu coba lagi.";
  if (status === 429) return "Terlalu banyak permintaan ke DeepSeek. Tunggu sebentar lalu coba lagi.";
  if (status === 503) return "Server DeepSeek sedang sibuk. Coba lagi beberapa saat.";
  if (status >= 500) return "DeepSeek sedang bermasalah. Coba lagi nanti.";
  if (status === 400) {
    const snippet = body.replace(/\s+/g, " ").slice(0, 160);
    if (/model/i.test(snippet)) {
      return (
        "Model DeepSeek tidak dikenali. Pilih deepseek-flash atau deepseek-v4-pro di " +
        "Pengaturan → API & Models. (" + snippet + ")"
      );
    }
    const detail = snippet ? " (" + snippet + ")" : "";
    return "Permintaan ditolak DeepSeek." + detail;
  }
  return "DeepSeek mengembalikan error " + status + ".";
}

function extractError(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    return parsed.error?.message ?? body;
  } catch {
    return body;
  }
}

async function withTimeout<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function callDeepSeek(options: {
  apiKey: string;
  model: string;
  messages: DeepSeekMessage[];
  tools?: unknown[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** "required" forces the model to call at least one tool. */
  toolChoice?: "auto" | "required" | "none";
  /** Thinking mode burns max_tokens on hidden reasoning; off by default. */
  thinking?: boolean;
}): Promise<DeepSeekCompletion> {
  const {
    apiKey,
    model,
    messages,
    tools,
    temperature = 0.3,
    maxTokens = 700,
    timeoutMs = 45000,
    toolChoice = "auto",
    thinking = false,
  } = options;

  if (!apiKey.trim()) {
    throw new DeepSeekError("API key DeepSeek belum diatur. Buka Pengaturan → API & Models.", 401);
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
    // Thinking is enabled by default on current DeepSeek models and eats into
    // max_tokens; the secretary answers in two sentences, so keep it off unless
    // a caller explicitly needs it.
    thinking: { type: thinking ? "enabled" : "disabled" },
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = toolChoice;
  }

  const send = (payload: Record<string, unknown>) =>
    withTimeout(async (signal) => {
      const response = await fetch(DEEPSEEK_BASE_URL + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new DeepSeekError(friendlyMessage(response.status, extractError(raw)), response.status);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          finish_reason?: string;
          message?: {
            content?: string | null;
            tool_calls?: DeepSeekToolCall[];
            reasoning_content?: string | null;
          };
        }>;
      };
      const choice = data.choices?.[0];
      const message = choice?.message;

      return {
        content: message?.content?.trim() ?? "",
        toolCalls: message?.tool_calls ?? [],
        finishReason: choice?.finish_reason ?? "stop",
        reasoning: (message?.reasoning_content ?? "").trim(),
      };
    }, timeoutMs);

  try {
    try {
      return await send(body);
    } catch (error) {
      // A deployment that predates the thinking switch rejects unknown fields.
      // Retry once without it instead of failing the whole chat.
      if (error instanceof DeepSeekError && error.status === 400 && /thinking/i.test(error.message)) {
        const { thinking: _thinking, ...legacyBody } = body;
        return await send(legacyBody);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DeepSeekError("DeepSeek tidak merespons tepat waktu. Periksa koneksi lalu coba lagi.");
    }
    throw new DeepSeekError("Tidak bisa menghubungi DeepSeek. Periksa koneksi internet.");
  }
}

export async function testApiKey(apiKey: string): Promise<void> {
  if (!apiKey.trim()) {
    throw new DeepSeekError("API key masih kosong.", 401);
  }
  try {
    const response = await withTimeout(
      (signal) =>
        fetch(DEEPSEEK_BASE_URL + "/models", {
          headers: { Authorization: "Bearer " + apiKey },
          signal,
        }),
      15000,
    );
    if (!response.ok) {
      const raw = await response.text();
      throw new DeepSeekError(friendlyMessage(response.status, extractError(raw)), response.status);
    }
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new DeepSeekError("Koneksi ke DeepSeek timeout.");
    }
    throw new DeepSeekError("Tidak bisa menghubungi DeepSeek. Periksa koneksi internet.");
  }
}
