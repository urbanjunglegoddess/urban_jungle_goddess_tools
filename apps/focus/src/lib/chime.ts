/**
 * The hand-off signal.
 *
 * WebAudio tones rather than an audio file: no asset to ship, no load to wait
 * on, and it works offline. The context is created lazily on the first user
 * gesture because browsers refuse to start one before that.
 */
let ctx: AudioContext | null = null;

/** Call from a click handler so the browser lets the context start. */
export function unlock(): void {
  try {
    ctx = ctx ?? new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no audio available — the run still keeps time silently */
  }
}

function beep(freq: number, dur: number): void {
  try {
    ctx = ctx ?? new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    // Ramp rather than switch, so it reads as a chime and not a click.
    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    /* ignore */
  }
}

/** Two rising tones — one segment just handed off to the next. */
export function handoff(muted: boolean): void {
  if (muted) return;
  beep(680, 0.16);
  setTimeout(() => beep(1020, 0.22), 190);
}

/** Three rising tones — the window is closed. */
export function complete(muted: boolean): void {
  if (muted) return;
  beep(560, 0.3);
  setTimeout(() => beep(840, 0.3), 260);
  setTimeout(() => beep(1120, 0.42), 540);
}
