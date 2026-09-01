"use client";

import { useEffect, useRef, useState } from "react";
import {
  CONFIGS, BUFFERS, fmt, mmss, clock, addMin, usable,
  compute, buildSegments, activeSegment, type Seg,
} from "../lib/focusCore";

/**
 * One component, four tools. Pick the shell with `variant`:
 *   "fit"      — window + compare grid only (the calculator)
 *   "planner"  — window + one style + blocks + static timed plan
 *   "combined" — window + selectable compare grid + blocks + static timed plan
 *   "live"     — combined + Start / live now-line / hand-off chime (the full tool)
 */
export type Variant = "fit" | "planner" | "combined" | "live";

type Committed = {
  startedAt: number; cfgName: string; work: number; brk: number;
  segs: Seg[]; total: number; n: number;
};

const KEY = "pf";
const load = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(`${KEY}.${k}`); return v == null ? d : (JSON.parse(v) as T); }
  catch { return d; }
};
const save = (k: string, v: unknown) => { try { localStorage.setItem(`${KEY}.${k}`, JSON.stringify(v)); } catch {} };
const canPersist = () => { try { localStorage.setItem(`${KEY}.__t`, "1"); localStorage.removeItem(`${KEY}.__t`); return true; } catch { return false; } };

export default function FocusWindow({ variant = "live" }: { variant?: Variant }) {
  const showCompare = variant === "combined" || variant === "live"; // selectable grid
  const showFitOnly = variant === "fit";
  const showStyleChips = variant === "planner";
  const showBlocks = variant !== "fit";
  const showPlan = variant !== "fit";
  const showLive = variant === "live";

  const [mode, setMode]       = useState<"until" | "length">(() => load("mode", "until"));
  const [until, setUntil]     = useState(() => load("until", ""));
  const [lenH, setLenH]       = useState<number>(() => load("lenH", 1));
  const [lenM, setLenM]       = useState<number>(() => load("lenM", 50));
  const [buffer, setBuffer]   = useState<number>(() => load("buffer", 10));
  const [cfg, setCfg]         = useState<number>(() => load("cfg", 1));
  const [restLast, setRest]   = useState<boolean>(() => load("restLast", false));
  const [blocks, setBlocks]   = useState<string[]>(() => load("blocks", []));
  const [muted, setMuted]     = useState<boolean>(() => load("muted", false));
  const [running, setRunning] = useState<boolean>(() => (showLive ? load("running", false) : false));
  const [committed, setCommitted] = useState<Committed | null>(() => (showLive ? load("committed", null) : null));
  const [draft, setDraft]     = useState("");
  const [persist, setPersist] = useState(true);
  const [, tickForce]         = useState(0); // forces re-render on the live tick

  const audio = useRef<AudioContext | null>(null);
  const lastActive = useRef(-1);
  const doneFired = useRef(false);

  useEffect(() => { setPersist(canPersist()); }, []);
  useEffect(() => { save("mode", mode); }, [mode]);
  useEffect(() => { save("until", until); }, [until]);
  useEffect(() => { save("lenH", lenH); }, [lenH]);
  useEffect(() => { save("lenM", lenM); }, [lenM]);
  useEffect(() => { save("buffer", buffer); }, [buffer]);
  useEffect(() => { save("cfg", cfg); }, [cfg]);
  useEffect(() => { save("restLast", restLast); }, [restLast]);
  useEffect(() => { save("blocks", blocks); }, [blocks]);
  useEffect(() => { save("muted", muted); }, [muted]);
  useEffect(() => { if (showLive) save("running", running); }, [running, showLive]);
  useEffect(() => { if (showLive) save("committed", committed); }, [committed, showLive]);

  // default the "until" input to +110 min if empty
  useEffect(() => {
    if (mode === "until" && !until) {
      const d = addMin(new Date(), 110); d.setSeconds(0, 0);
      setUntil(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // live tick
  useEffect(() => {
    const id = setInterval(() => { if (running && committed) tickForce((x) => x + 1); }, 1000);
    return () => clearInterval(id);
  }, [running, committed]);

  const win = usable({ mode, until, buffer, lenH, lenM });
  const T = win.usable;

  const beep = (freq: number, dur: number) => {
    if (muted) return;
    try {
      audio.current = audio.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audio.current, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq; o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0008, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  };
  const handoff = () => { beep(680, 0.16); setTimeout(() => beep(1020, 0.22), 190); };
  const doneChime = () => { beep(560, 0.3); setTimeout(() => beep(840, 0.3), 260); setTimeout(() => beep(1120, 0.42), 540); };

  const addBlock = () => { const v = draft.trim(); if (!v) return; setBlocks((b) => [...b, v]); setDraft(""); };
  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, k) => k !== i));
  const moveUp = (i: number) => setBlocks((b) => { if (i <= 0) return b; const c = [...b]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; });

  const startRun = () => {
    if (T == null || !win.valid) return;
    const c = CONFIGS[cfg];
    const { segs, total, n } = buildSegments(c.work, c.brk, T, restLast, blocks);
    if (n === 0) return;
    try {
      audio.current = audio.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audio.current.state === "suspended") audio.current.resume();
    } catch {}
    lastActive.current = -1; doneFired.current = false;
    setCommitted({ startedAt: Date.now(), cfgName: c.name, work: c.work, brk: c.brk, segs, total, n });
    setRunning(true);
  };
  const stopRun = () => { setRunning(false); setCommitted(null); lastActive.current = -1; doneFired.current = false; };

  // ---- derived views ----
  const c = CONFIGS[cfg];
  const rows = (T != null && win.valid) ? CONFIGS.map((cc, i) => ({ cc, i, r: compute(cc.work, cc.brk, T, restLast) })) : [];
  const maxFocus = rows.length ? Math.max(...rows.map((x) => x.r.focus)) : 0;

  return (
    <div className="fw">
      <p className="eyebrow">Plan the window</p>
      <h1>Focus <span>Window</span></h1>
      <p className="sub">
        {showLive ? "Set when you have to stop, pick a style, load your tasks — then start the run and let it keep time."
          : showFitOnly ? "Set the time you've got. See how many focus sessions and breaks fit."
          : "Set when you have to stop. Load your tasks. Get a timed run."}
      </p>

      {/* WINDOW */}
      <div className="card">
        <p className="lbl">The window</p>
        <div className="segtog">
          <button className={mode === "until" ? "on" : ""} onClick={() => setMode("until")}>Until a time</button>
          <button className={mode === "length" ? "on" : ""} onClick={() => setMode("length")}>For a length</button>
        </div>
        {mode === "until" ? (
          <div className="row"><span className="hint">Free until</span>
            <input type="time" value={until} onChange={(e) => setUntil(e.target.value)} /></div>
        ) : (
          <div className="row"><span className="hint">I have</span>
            <input className="num" type="number" min={0} max={24} value={lenH || ""} onChange={(e) => setLenH(Math.max(0, Math.min(24, +e.target.value || 0)))} /><span className="hint">h</span>
            <input className="num" type="number" min={0} max={59} value={lenM} onChange={(e) => setLenM(Math.max(0, Math.min(59, +e.target.value || 0)))} /><span className="hint">m</span></div>
        )}
        <div style={{ marginTop: 14 }}>
          <p className="lbl" style={{ marginBottom: 9 }}>Buffer at the end</p>
          <div className="chips">
            {BUFFERS.map((b) => (
              <button key={b} className={`chip ${b === buffer ? "on" : ""}`} onClick={() => setBuffer(b)}>{b ? `${b}m` : "None"}</button>
            ))}
          </div>
        </div>
        <div className={`toggle ${restLast ? "on" : ""}`} role="switch" aria-checked={restLast} tabIndex={0}
          onClick={() => setRest((v) => !v)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setRest((v) => !v); } }}>
          <span className="switch" /><span>Rest after the last session too</span>
        </div>
        <p className={`winline ${win.expired ? "warn" : ""}`}>
          {win.raw == null ? "Set a stop time to size the window."
            : win.expired ? "That time's already gone by today — pick a later one, or switch to For a length."
            : mode === "until"
              ? (buffer
                ? <>Now → stop by <b>{clock(new Date(Date.now() + (win.raw) * 60000))}</b>, minus {buffer}m buffer = <b>{fmt(T!)}</b> to work.</>
                : <>Now → <b>{clock(new Date(Date.now() + win.raw * 60000))}</b> = <b>{fmt(T!)}</b> to work.</>)
              : <><b>{fmt(T!)}</b> to work{buffer ? ` (after a ${buffer}m buffer)` : ""}.</>}
        </p>
      </div>

      {/* STYLE — planner single-pick chips */}
      {showStyleChips && (
        <div className="card">
          <p className="lbl">Session style</p>
          <div className="chips">
            {CONFIGS.map((cc, i) => (
              <button key={i} className={`chip ${i === cfg ? "on" : ""}`} onClick={() => setCfg(i)}>
                {cc.name}<span className="s"> {cc.work}/{cc.brk}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMPARE — fit grid (read-only) or selectable */}
      {(showCompare || showFitOnly) && (
        <>
          <p className="sech">Which style fits</p>
          <p className="sechsub">{showFitOnly ? "Every style measured against your window." : "Every style measured against your window. Tap one to build the run."}</p>
          {showLive && running && <p className="lock">Running — stop the run to change style.</p>}
          {(T == null || !win.valid) ? <p className="msg">Set the window above to compare styles.</p> :
            rows.map(({ cc, i, r }) => {
              const sel = i === cfg, best = r.focus > 0 && r.focus === maxFocus;
              if (r.n === 0) return (
                <div key={i} className="res dead"><div className="reshead"><div className="cfgn">{cc.name} <small>{cc.work}/{cc.brk}</small></div></div>
                  <p className="none">Won&apos;t fit a single {cc.work}-minute session.</p></div>);
              const selectable = !showFitOnly && !(showLive && running);
              return (
                <div key={i} className={`res ${sel && !showFitOnly ? "sel" : ""} ${selectable ? "pick" : ""}`}
                  onClick={() => selectable && setCfg(i)} role={selectable ? "button" : undefined} tabIndex={selectable ? 0 : undefined}>
                  <div className="reshead"><div className="cfgn">{cc.name} <small>{cc.work}/{cc.brk}</small></div>
                    {!showFitOnly && sel ? <span className="badge plan">Planning this</span> : best ? <span className="badge best">Most focus</span> : null}</div>
                  <div className="stats">
                    <Stat v={String(r.n)} k="Sessions" /><Stat v={String(r.breaks)} k="Breaks" dim={!r.breaks} />
                    <Stat v={fmt(r.focus)} k="Focus" /><Stat v={r.spare ? fmt(r.spare) : "0m"} k="Left over" spare={!!r.spare} dim={!r.spare} />
                  </div>
                  <Timeline work={cc.work} brk={cc.brk} r={r} restLast={restLast} />
                </div>);
            })}
          <div className="legend"><span><i className="sw w" />Focus</span><span><i className="sw b" />Break</span><span><i className="sw s" />Left over</span></div>
        </>
      )}

      {/* BLOCKS */}
      {showBlocks && (
        <>
          <p className="sech">Your blocks</p>
          <p className="sechsub">What you want to get through. Top of the list runs first.</p>
          <div className="card">
            <div className="addrow">
              <input className="text" placeholder="What's a session for?" maxLength={80} value={draft}
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBlock(); } }} />
              <button className="addbtn" onClick={addBlock}>Add</button>
            </div>
            {blocks.length ? (
              <ul className="blocks">
                {blocks.map((b, i) => (
                  <li key={i}><span className="idx">{i + 1}</span><span className="btxt">{b}</span>
                    <button className="minib" disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }} onClick={() => moveUp(i)} aria-label="move up">▲</button>
                    <button className="minib del" onClick={() => removeBlock(i)} aria-label="remove">✕</button></li>
                ))}
              </ul>
            ) : <p className="emptyb">No blocks yet. Add tasks and they&apos;ll drop onto the sessions below.</p>}
            <div className="bfoot">
              <span className={`held ${!persist && blocks.length ? "warn" : ""}`}>
                {!blocks.length ? "" : persist ? `${blocks.length} held` : `${blocks.length} added · won't persist here`}
              </span>
              {blocks.length ? <button className="clearall" onClick={() => setBlocks([])}>Clear all</button> : null}
            </div>
          </div>
        </>
      )}

      {/* PLAN / RUN */}
      {showPlan && (
        <>
          <p className="sech">The run</p>
          <p className="sechsub">
            {showLive && running && committed ? `Running ${committed.cfgName} — locked to the clock.`
              : `Timed, using ${c.name} (${c.work}/${c.brk}).`}
          </p>
          <div className="card">
            {showLive && running && committed
              ? <LiveRun committed={committed} onStop={stopRun} muted={muted} setMuted={setMuted}
                  onChime={(kind) => { if (kind === "done") doneChime(); else handoff(); }}
                  lastActive={lastActive} doneFired={doneFired} />
              : <StaticPlan T={T} valid={win.valid} c={c} restLast={restLast} blocks={blocks}
                  live={showLive} muted={muted} setMuted={setMuted} onStart={startRun} />}
          </div>
        </>
      )}

      <p className="note">
        {showLive
          ? <><b>How it runs:</b> Start locks the plan to the clock so it stops sliding; a live counter shows the block you&apos;re in and the time left, and a chime marks every hand-off. Stop returns you to planning.</>
          : <><b>How it fills:</b> sessions run back to back with a break between each; your blocks drop on in order, extras read open focus, and blocks that don&apos;t fit are flagged to carry forward. Trailing break dropped by default.</>}
        <br /><br /><b>Holding your list:</b> saved in this browser when storage is available; the badge under your list tells you the truth for wherever you run it.
      </p>

      <style jsx>{styles}</style>
      <style jsx global>{globalStyles}</style>
    </div>
  );
}

function Stat({ v, k, spare, dim }: { v: string; k: string; spare?: boolean; dim?: boolean }) {
  return <div className="stat"><span className={`v ${spare ? "spare" : ""} ${dim ? "zero" : ""}`}>{v}</span><span className="k">{k}</span></div>;
}

function Timeline({ work, brk, r, restLast }: { work: number; brk: number; r: ReturnType<typeof compute>; restLast: boolean }) {
  const segs: { c: string; flex: number }[] = [];
  for (let k = 0; k < r.n; k++) {
    segs.push({ c: "w", flex: work });
    const nb = restLast ? true : k < r.n - 1;
    if (nb && r.breaks > 0) segs.push({ c: "b", flex: brk });
  }
  if (r.spare > 0) segs.push({ c: "s", flex: r.spare });
  return <div className="tl">{segs.map((s, i) => <div key={i} className={`seg ${s.c}`} style={{ flex: s.flex }} />)}</div>;
}

function StaticPlan({ T, valid, c, restLast, blocks, live, muted, setMuted, onStart }: {
  T: number | null; valid: boolean; c: typeof CONFIGS[number]; restLast: boolean; blocks: string[];
  live: boolean; muted: boolean; setMuted: (f: (v: boolean) => boolean) => void; onStart: () => void;
}) {
  if (T == null || !valid) return <p className="msg">Set the window{live ? " and tap a style" : ""} to build the run.</p>;
  const { n, breaks } = compute(c.work, c.brk, T, restLast);
  if (n === 0) return <p className="msg">{c.name} won&apos;t fit {fmt(T)}. Pick a shorter style.</p>;
  let t = new Date(); const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const wEnd = addMin(t, c.work), label = blocks[i] ?? null;
    items.push(
      <li key={`w${i}`}><div className="ptime">{clock(t)} <span className="to">– {clock(wEnd)}</span></div>
        <div className="pbody"><div className="bwork"><span className="dot w" />
          <div><div className={`blabel ${label ? "" : "open"}`}>{label ?? "Open focus"}</div>
            <div className="btag">Session {i + 1} · {c.work}m</div></div></div></div></li>);
    t = wEnd; const nb = restLast ? true : i < n - 1;
    if (nb) { const bEnd = addMin(t, c.brk);
      items.push(<li key={`b${i}`}><div className="ptime">{clock(t)} <span className="to">– {clock(bEnd)}</span></div>
        <div className="pbody"><div className="bbreak"><span className="dot b" />Break · {c.brk}m</div></div></li>); t = bEnd; }
  }
  const left = blocks.length - n;
  return (
    <>
      <p className="psum"><b>{n}</b> session{n > 1 ? "s" : ""} · <b>{breaks}</b> break{breaks !== 1 ? "s" : ""} · <b>{fmt(n * c.work)}</b> focus · done by <b>{clock(t)}</b></p>
      <ol className="plan">{items}</ol>
      {left > 0 && <div className="overflow"><b>{left} block{left > 1 ? "s" : ""} won&apos;t fit this window</b> — carry into the next one:
        <ul>{blocks.slice(n).map((b, i) => <li key={i}>{b}</li>)}</ul></div>}
      {left <= 0 && blocks.length > 0 && blocks.length < n &&
        <div className="overflow soft">{n - blocks.length} open session{n - blocks.length > 1 ? "s" : ""} past your list — spare focus, or add more blocks.</div>}
      {live && (
        <div className="runctrl">
          <button className="startbtn" onClick={onStart}>▶  Start the run</button>
          <button className={`iconbtn ${muted ? "" : "on"}`} onClick={() => setMuted((v) => !v)} aria-label="sound">{muted ? "🔕" : "🔔"}</button>
        </div>)}
    </>
  );
}

function LiveRun({ committed, onStop, muted, setMuted, onChime, lastActive, doneFired }: {
  committed: Committed; onStop: () => void; muted: boolean;
  setMuted: (f: (v: boolean) => boolean) => void; onChime: (k: "handoff" | "done") => void;
  lastActive: React.MutableRefObject<number>; doneFired: React.MutableRefObject<boolean>;
}) {
  const base = new Date(committed.startedAt);
  const elapsedMin = (Date.now() - committed.startedAt) / 60000;
  const idx = activeSegment(committed.segs, elapsedMin);
  const done = elapsedMin >= committed.total;

  useEffect(() => {
    if (done) { if (!doneFired.current) { doneFired.current = true; onChime("done"); } return; }
    if (idx !== lastActive.current) { if (lastActive.current !== -1) onChime("handoff"); lastActive.current = idx; }
  });

  let now: React.ReactNode;
  if (done) {
    now = <div className="now done"><div className="nowtop"><span className="nowkind donek">Window complete</span>
      <span className="nowclock">{clock(base)} – {clock(addMin(base, committed.total))}</span></div>
      <div className="nowlabel">That&apos;s the run.</div>
      <div className="nownext">{fmt(committed.total)} clocked · {committed.segs.filter((s) => s.type === "work").length} sessions done.</div></div>;
  } else {
    const s = committed.segs[idx]; const remSec = (s.m1 - elapsedMin) * 60;
    const prog = ((elapsedMin - s.m0) / (s.m1 - s.m0)) * 100;
    const nxt = committed.segs[idx + 1];
    const nextTxt = nxt ? (nxt.type === "break" ? `Break · ${Math.round(nxt.m1 - nxt.m0)}m`
      : (nxt.label ?? `Session ${(nxt.idx ?? 0) + 1} · open focus`)) : "Nothing — window closes";
    now = (
      <div className={`now ${s.type === "break" ? "break" : ""}`}>
        <div className="nowtop"><span className="nowkind">{s.type === "break" ? "Break" : `Focus · Session ${(s.idx ?? 0) + 1}`}</span>
          <span className="nowclock">ends {clock(addMin(base, s.m1))}</span></div>
        <div className={`nowlabel ${s.type === "work" && !s.label ? "open" : ""}`}>{s.type === "break" ? "Step back." : (s.label ?? "Open focus")}</div>
        <div className="count">{mmss(remSec)}<small>left</small></div>
        <div className="prog"><i style={{ width: `${prog}%` }} /></div>
        <div className="nownext">Next — <b>{nextTxt}</b></div>
      </div>);
  }

  return (
    <>
      {now}
      <ul className="runlist">
        {committed.segs.map((s, i) => {
          const past = elapsedMin >= s.m1, active = elapsedMin >= s.m0 && elapsedMin < s.m1;
          return (
            <li key={i} className={past ? "past" : active ? "active" : ""}>
              <span className="rltime">{clock(addMin(base, s.m0))}</span>
              <div className="rlbody"><span className={`dot ${s.type === "break" ? "b" : "w"}`} />
                {s.type === "break" ? <span className="rlsub">Break · {Math.round(s.m1 - s.m0)}m</span>
                  : <span className="rllabel">{s.label ?? "Open focus"}</span>}
                {past && <span className="check">✓</span>}</div>
            </li>);
        })}
      </ul>
      <div className="runctrl" style={{ marginTop: 12 }}>
        <button className="stopbtn" onClick={onStop}>{done ? "Done — clear" : "Stop the run"}</button>
        <button className={`iconbtn ${muted ? "" : "on"}`} onClick={() => setMuted((v) => !v)} aria-label="sound">{muted ? "🔕" : "🔔"}</button>
      </div>
    </>
  );
}

/* ---------------- styles (styled-jsx) ---------------- */
const globalStyles = `
  .fw{--bg:#0A0A0A;--bg2:#071E15;--panel:#042F1E;--panel2:#073D26;--line:#0D5E39;--gold:#F2B01E;--gold-deep:#E1A443;--cream:#F7DFC0;--sage:#A8A5A0;--sage-dim:#90958A;--work:#2E6B4F;--work-lo:#0D5E39;--break:#E1A443;--spare:#587156;--clay:#E28D1F;}
`;
const styles = `
  .fw{max-width:640px;margin:0 auto;padding:22px 16px 70px;color:var(--cream);line-height:1.45;
    background:radial-gradient(120% 80% at 50% -10%,#074128 0%,var(--bg) 55%);
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;}
  .eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold-deep);font-weight:700;margin:0 0 6px}
  h1{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:2.15rem;line-height:1.02;margin:0 0 8px;letter-spacing:-.01em}
  h1 span{color:var(--gold)}
  .sub{color:var(--sage);font-size:.92rem;margin:0 0 22px}
  .sech{font-family:Fraunces,serif;font-weight:600;font-size:1.25rem;margin:26px 0 3px}
  .sechsub{color:var(--sage-dim);font-size:.83rem;margin:0 0 13px}
  .lock{color:var(--gold-deep);font-size:.82rem;font-weight:600;margin:0 0 12px}
  .card{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:16px;padding:16px 15px;margin-bottom:14px}
  .lbl{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--sage);font-weight:700;margin:0 0 12px}
  .segtog{display:flex;background:var(--bg2);border:1px solid var(--line);border-radius:11px;padding:3px;margin-bottom:14px}
  .segtog button{flex:1;border:0;background:transparent;color:var(--sage);font:inherit;font-weight:600;font-size:.86rem;padding:8px;border-radius:8px;cursor:pointer}
  .segtog button.on{background:var(--gold);color:#0A0A0A}
  .row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  input[type=time],.num,.text{background:var(--bg2);border:1px solid var(--line);color:var(--cream);font:inherit;border-radius:11px}
  input[type=time]{color-scheme:dark;font-size:1.05rem;font-weight:600;padding:10px 12px}
  .num{width:74px;text-align:center;font-size:1.05rem;font-weight:600;padding:10px 12px}
  .hint{color:var(--sage-dim);font-size:.82rem}
  .chips{display:flex;flex-wrap:wrap;gap:8px}
  .chip{border:1px solid var(--line);background:var(--bg2);color:var(--cream);font:inherit;font-size:.88rem;font-weight:600;padding:8px 12px;border-radius:999px;cursor:pointer}
  .chip.on{background:var(--gold);color:#0A0A0A;border-color:var(--gold)}
  .chip .s{font-size:.72rem;color:var(--sage-dim)}
  .chip.on .s{color:#0A0A0A}
  .toggle{display:flex;align-items:center;gap:11px;margin-top:14px;color:var(--sage);font-size:.85rem;cursor:pointer;user-select:none}
  .switch{position:relative;width:44px;height:25px;border-radius:999px;background:var(--spare);border:1px solid var(--line);flex:none;transition:background .18s}
  .switch::after{content:"";position:absolute;top:2px;left:2px;width:19px;height:19px;border-radius:50%;background:var(--cream);transition:left .18s}
  .toggle.on .switch{background:var(--gold)}
  .toggle.on .switch::after{left:21px}
  .winline{font-size:.92rem;color:var(--sage);margin:15px 0 0}
  .winline :global(b){color:var(--gold)}
  .winline.warn{color:var(--clay)}
  .res{background:linear-gradient(180deg,var(--panel2),var(--panel));border:1px solid var(--line);border-radius:14px;padding:13px 14px 12px;margin-bottom:10px}
  .res.pick{cursor:pointer}
  .res.sel{border-color:var(--gold);box-shadow:0 0 0 1.5px var(--gold)}
  .res.dead{opacity:.55}
  .reshead{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
  .cfgn{font-family:Fraunces,serif;font-weight:600;font-size:1.1rem}
  .cfgn small{font-family:ui-sans-serif,system-ui;font-weight:600;font-size:.72rem;color:var(--sage-dim)}
  .badge{font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;padding:3px 7px;border-radius:6px}
  .badge.plan{color:#0A0A0A;background:var(--gold)}
  .badge.best{color:var(--gold-deep);border:1px solid var(--gold-deep)}
  .stats{display:flex;gap:16px;margin:10px 0 11px;flex-wrap:wrap}
  .stat{display:flex;flex-direction:column;gap:1px}
  .stat .v{font-size:1.4rem;font-weight:700;font-variant-numeric:tabular-nums;line-height:1}
  .stat .v.spare{color:var(--clay)}.stat .v.zero{color:var(--sage-dim)}
  .stat .k{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--sage-dim);font-weight:700}
  .tl{display:flex;height:12px;border-radius:5px;overflow:hidden;background:var(--bg);border:1px solid var(--line)}
  .seg{height:100%}
  .seg.w{background:linear-gradient(180deg,var(--work),var(--work-lo))}
  .seg.b{background:var(--break)}
  .seg.s{background:repeating-linear-gradient(45deg,var(--spare),var(--spare) 4px,transparent 4px,transparent 8px)}
  .none{color:var(--sage-dim);font-size:.85rem;font-style:italic;margin:6px 0 2px}
  .legend{display:flex;gap:16px;flex-wrap:wrap;margin:4px 0 0;color:var(--sage);font-size:.78rem}
  .legend span{display:inline-flex;align-items:center;gap:6px}
  .sw{width:13px;height:13px;border-radius:3px}
  .sw.w{background:var(--work)}.sw.b{background:var(--break)}.sw.s{background:var(--spare)}
  .addrow{display:flex;gap:9px}
  .text{flex:1;font-size:.98rem;padding:11px 13px}
  .addbtn{border:0;background:var(--gold);color:#0A0A0A;font:inherit;font-weight:800;font-size:.9rem;padding:0 16px;border-radius:11px;cursor:pointer}
  .blocks{list-style:none;margin:13px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
  .blocks li{display:flex;align-items:center;gap:10px;background:var(--bg2);border:1px solid var(--line);border-radius:11px;padding:9px 10px 9px 12px}
  .idx{font-variant-numeric:tabular-nums;font-weight:800;color:var(--gold-deep);font-size:.9rem;min-width:16px}
  .btxt{flex:1;font-size:.95rem;word-break:break-word}
  .minib{border:1px solid var(--line);background:transparent;color:var(--sage);width:30px;height:30px;border-radius:8px;font-size:1rem;cursor:pointer}
  .minib.del{color:var(--clay)}
  .emptyb{color:var(--sage-dim);font-size:.86rem;font-style:italic;margin:13px 0 0}
  .bfoot{display:flex;justify-content:space-between;align-items:center;margin-top:12px}
  .held{color:var(--sage-dim);font-size:.75rem}.held.warn{color:var(--clay)}
  .clearall{border:0;background:transparent;color:var(--sage-dim);font:inherit;font-size:.78rem;text-decoration:underline;cursor:pointer}
  .psum{color:var(--sage);font-size:.86rem;margin:0 0 14px}.psum :global(b){color:var(--gold)}
  .plan{list-style:none;margin:0;padding:0}
  .plan li{display:flex;gap:13px}
  .ptime{font-variant-numeric:tabular-nums;font-size:.8rem;color:var(--sage);min-width:118px;padding-top:11px;white-space:nowrap}
  .ptime .to{color:var(--sage-dim)}
  .pbody{flex:1;padding:10px 0 12px;border-bottom:1px solid var(--line)}
  .plan li:last-child .pbody{border-bottom:0}
  .bwork{display:flex;align-items:center;gap:9px}
  .dot{width:9px;height:9px;border-radius:50%;flex:none}
  .dot.w{background:var(--work)}.dot.b{background:var(--break)}
  .blabel{font-size:1rem;font-weight:600}.blabel.open{color:var(--sage-dim);font-weight:500;font-style:italic}
  .btag{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--sage-dim);font-weight:700;margin-top:1px}
  .bbreak{display:flex;align-items:center;gap:9px;color:var(--gold-deep);font-size:.85rem;font-weight:600}
  .overflow{background:var(--bg2);border:1px dashed var(--clay);border-radius:12px;padding:12px 13px;margin-top:14px;color:var(--clay);font-size:.86rem}
  .overflow.soft{border-color:var(--line);color:var(--sage)}
  .overflow :global(b){color:var(--cream)}
  .overflow ul{margin:7px 0 0;padding-left:18px;color:var(--cream)}
  .msg{color:var(--sage-dim);font-size:.92rem;font-style:italic;padding:6px 0}
  .runctrl{display:flex;gap:10px;align-items:center;margin-top:4px}
  .startbtn{flex:1;border:0;background:var(--gold);color:#0A0A0A;font:inherit;font-weight:800;font-size:1.02rem;padding:14px;border-radius:12px;cursor:pointer}
  .stopbtn{flex:1;border:1px solid var(--line);background:var(--bg2);color:var(--sage);font:inherit;font-weight:700;font-size:.86rem;padding:11px 14px;border-radius:11px;cursor:pointer}
  .iconbtn{border:1px solid var(--line);background:var(--bg2);color:var(--sage);width:48px;height:48px;border-radius:12px;font-size:1.15rem;cursor:pointer;flex:none}
  .iconbtn.on{color:var(--gold);border-color:var(--gold-deep)}
  .now{background:linear-gradient(180deg,#08442A,#074128);border:1.5px solid var(--gold-deep);border-radius:16px;padding:17px 16px;margin-bottom:14px}
  .now.break{border-color:var(--break)}.now.done{border-color:var(--work)}
  .nowtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px}
  .nowkind{font-size:10.5px;letter-spacing:.15em;text-transform:uppercase;font-weight:800;color:var(--gold)}
  .now.break .nowkind{color:var(--break)}.nowkind.donek{color:var(--work)}
  .nowclock{font-variant-numeric:tabular-nums;font-size:.78rem;color:var(--sage)}
  .nowlabel{font-family:Fraunces,serif;font-weight:600;font-size:1.5rem;line-height:1.05;color:var(--cream);margin:0 0 12px}
  .nowlabel.open{font-style:italic;color:var(--sage)}
  .count{font-variant-numeric:tabular-nums;font-size:3.1rem;font-weight:700;line-height:1;letter-spacing:-.02em}
  .count small{font-size:1rem;font-weight:600;color:var(--sage);margin-left:6px}
  .prog{height:7px;border-radius:4px;background:var(--bg);border:1px solid var(--line);overflow:hidden;margin:14px 0 10px}
  .prog i{display:block;height:100%;background:linear-gradient(90deg,var(--work),var(--gold))}
  .nownext{color:var(--sage);font-size:.85rem}.nownext :global(b){color:var(--cream);font-weight:600}
  .runlist{list-style:none;margin:0;padding:0}
  .runlist li{display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)}
  .runlist li:last-child{border-bottom:0}
  .rltime{font-variant-numeric:tabular-nums;font-size:.78rem;color:var(--sage-dim);min-width:66px;padding-top:2px}
  .rlbody{flex:1;display:flex;align-items:center;gap:8px}
  .rllabel{font-size:.95rem;font-weight:600}.rlsub{font-size:.78rem;color:var(--sage-dim)}
  .runlist li.past .rllabel,.runlist li.past .rltime{color:var(--sage-dim);text-decoration:line-through}
  .runlist li.active{background:rgba(242,176,30,.06);border-radius:9px;margin:0 -8px;padding:8px 8px}
  .runlist li.active .rllabel{color:var(--gold)}
  .check{color:var(--work);font-weight:800;font-size:.9rem}
  .note{color:var(--sage-dim);font-size:.77rem;line-height:1.55;margin-top:24px;border-top:1px solid var(--line);padding-top:14px}
  .note :global(b){color:var(--sage)}
`;
