import type { NodeType } from "@/types/models";

/** Words that make a title readable to the agent and to the user. */
const VOWEL_PAIR = /[aeiou]{2,}/i;
const HEX_TOKEN = /^[0-9a-f]{16,}$/i;
const UUID_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Attachment pickers often hand back a content hash as the file name
 * ("6614bc757db6bf563b0f7e45dd0c666f.jpeg"). Such names confuse the agent:
 * it cannot tell a title from an ID, so it starts asking the user which one
 * they mean. Treated as "not human readable".
 */
export function looksLikeOpaqueName(value: string): boolean {
  const base = value.replace(/\.[^.]+$/, "").trim();
  if (!base) return true;
  if (UUID_TOKEN.test(base)) return true;
  const compact = base.replace(/[\s_-]+/g, "");
  if (HEX_TOKEN.test(compact)) return true;
  // Long, random-looking tokens without pronounceable vowels.
  return compact.length >= 24 && /^[a-z0-9]+$/i.test(compact) && !VOWEL_PAIR.test(compact);
}

/** Human friendly title for an imported attachment. */
export function attachmentTitle(name: string, type: NodeType, at: Date = new Date()): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  if (base && !looksLikeOpaqueName(base)) return base;

  const stamp = at.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  if (type === "image") return "Gambar " + stamp;
  if (type === "pdf") return "PDF " + stamp;
  return "Lampiran " + stamp;
}
