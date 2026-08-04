const KEY_PREFIX = "agk_live_";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generates a fresh API key. The full value is shown to the user exactly once. */
export function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const key = KEY_PREFIX + toHex(bytes.buffer);
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 6) };
}

/** SHA-256 of the key; only this is ever stored. */
export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key.trim()));
  return toHex(digest);
}
