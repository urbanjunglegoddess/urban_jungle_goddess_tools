/**
 * focusCore — the whole brain of every Focus Window tool.
 * Pure functions, zero DOM, zero framework. HTML, Next.js and Expo all import this.
 * Nothing here touches storage, styling, timers or sound — those live in the shells.
 */

export type Config = { name: string; work: number; brk: number };

export const CONFIGS: Config[] = [
  { name: "Sprint",    work: 15, brk: 5  },
  { name: "Classic",   work: 25, brk: 5  },
  { name: "Half hour", work: 30, brk: 5  },
  { name: "Deep 45",   work: 45, brk: 15 },
  { name: "Deep 50",   work: 50, brk: 10 },
  { name: "52 / 17",   work: 52, brk: 17 },
  { name: "Long haul", work: 90, brk: 20 },
];

export const BUFFERS = [0, 5, 10, 15];

export const pad = (n: number) => String(n).padStart(2, "0");

/** 95 -> "1h 35m" */
export function fmt(min: number): string {
  min = Math.round(min);
  const h = Math.floor(min / 60), r = min % 60;
  return h && r ? `${h}h ${r}m` : h ? `${h}h` : `${r}m`;
}

/** 125 -> "2:05" (mm:ss from seconds) */
export function mmss(sec: number): string {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
}

/** Cross-platform 12-hour clock. Manual, so it works in React Native without Intl. */
export function clock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "AM" : "PM";
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${pad(m)} ${ap}`;
}

export const addMin = (d: Date, m: number) => new Date(d.getTime() + m * 60000);

export type WindowState = {
  mode: "until" | "length";
  until: string;   // "HH:MM" 24h
  buffer: number;
  lenH: number;
  lenM: number;
};

/** Raw minutes in the window before the buffer. null = not set, may be <=0 when a time already passed. */
export function windowRaw(s: WindowState): number | null {
  if (s.mode === "length") return s.lenH * 60 + s.lenM;
  if (!s.until) return null;
  const now = new Date();
  const [H, M] = s.until.split(":").map(Number);
  const t = new Date(now); t.setHours(H, M, 0, 0);
  return (t.getTime() - now.getTime()) / 60000;
}

/** Usable minutes after the buffer, plus validity flags the shell renders against. */
export function usable(s: WindowState): {
  raw: number | null; usable: number | null; expired: boolean; valid: boolean;
} {
  const raw = windowRaw(s);
  if (raw === null) return { raw: null, usable: null, expired: false, valid: false };
  if (s.mode === "until" && raw <= 0) return { raw, usable: null, expired: true, valid: false };
  return { raw, usable: Math.max(raw - s.buffer, 0), expired: false, valid: true };
}

export type Fit = { n: number; breaks: number; focus: number; used: number; spare: number };

/** Max sessions that fit T minutes. Trailing break dropped unless restLast. */
export function compute(work: number, brk: number, T: number, restLast: boolean): Fit {
  if (work <= 0 || T <= 0) return { n: 0, breaks: 0, focus: 0, used: 0, spare: Math.max(T, 0) };
  let n = restLast ? Math.floor(T / (work + brk)) : Math.floor((T + brk) / (work + brk));
  if (n < 0) n = 0;
  const breaks = restLast ? n : Math.max(n - 1, 0);
  const focus = n * work, used = focus + breaks * brk;
  return { n, breaks, focus, used, spare: Math.max(T - used, 0) };
}

export type Seg = {
  type: "work" | "break";
  idx?: number;          // session index for work segments
  label?: string | null; // block assigned, or null = open focus
  m0: number;            // minutes from run start
  m1: number;
};

/** The timed skeleton: work/break segments with block labels dropped in order. */
export function buildSegments(
  work: number, brk: number, T: number, restLast: boolean, blocks: string[]
): { segs: Seg[]; total: number; n: number } {
  const { n } = compute(work, brk, T, restLast);
  let m = 0; const segs: Seg[] = [];
  for (let i = 0; i < n; i++) {
    segs.push({ type: "work", idx: i, label: blocks[i] ?? null, m0: m, m1: m + work });
    m += work;
    const nb = restLast ? true : i < n - 1;
    if (nb) { segs.push({ type: "break", m0: m, m1: m + brk }); m += brk; }
  }
  return { segs, total: m, n };
}

/** Which segment index is live at a given elapsed-minutes, or -1 if done/none. */
export function activeSegment(segs: Seg[], elapsedMin: number): number {
  for (let i = 0; i < segs.length; i++) {
    if (elapsedMin >= segs[i].m0 && elapsedMin < segs[i].m1) return i;
  }
  return -1;
}
