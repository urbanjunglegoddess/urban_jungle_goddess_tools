/**
 * Persistence, honestly.
 *
 * localStorage throws in a private window, with site data blocked, and in some
 * embedded webviews. Rather than pretend, the store probes once and exposes
 * `PERSIST` so the UI can tell the truth about whether a list will survive —
 * the original tool showed this under the block list and it is worth keeping.
 * When storage is unavailable it falls back to memory for the session.
 */

const PREFIX = "ujg.focus.";

function probe(): boolean {
  try {
    localStorage.setItem(PREFIX + "__t", "1");
    localStorage.removeItem(PREFIX + "__t");
    return true;
  } catch {
    return false;
  }
}

export const PERSIST = typeof localStorage !== "undefined" ? probe() : false;

const mem = new Map<string, unknown>();

export function get<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return mem.has(key) ? (mem.get(key) as T) : fallback;
  }
}

export function set(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    mem.set(key, value);
  }
}
