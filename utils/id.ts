const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Collision-resistant, readable ids that stay short inside prompts and DB rows. */
export function makeId(prefix: string): string {
  let random = "";
  for (let index = 0; index < 10; index += 1) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
