import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  CONFIGS, BUFFERS, fmt, mmss, clock, addMin, usable,
  compute, buildSegments, activeSegment, type Seg,
} from "../lib/focusCore";
import { T } from "../theme";

/**
 * One RN component, four tools via `variant`:
 *   "fit" | "planner" | "combined" | "live"  (see nextjs/components/FocusWindow.tsx for the shape).
 *
 * Deps:  @react-native-async-storage/async-storage   expo-haptics
 * The chime is delivered as a haptic pulse (asset-free, cross-platform). Swap in expo-av
 * with a bundled tone if you want audible sound — see chime() below.
 */
export type Variant = "fit" | "planner" | "combined" | "live";

type Committed = {
  startedAt: number; cfgName: string; work: number; brk: number;
  segs: Seg[]; total: number; n: number;
};

const KEY = "pf";
const jset = (k: string, v: unknown) => AsyncStorage.setItem(`${KEY}.${k}`, JSON.stringify(v)).catch(() => {});

export default function FocusWindow({ variant = "live" }: { variant?: Variant }) {
  const showCompare = variant === "combined" || variant === "live";
  const showFitOnly = variant === "fit";
  const showStyleChips = variant === "planner";
  const showBlocks = variant !== "fit";
  const showPlan = variant !== "fit";
  const showLive = variant === "live";

  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"until" | "length">("until");
  const [until, setUntil] = useState("");       // "HH:MM" 24h
  const [lenH, setLenH] = useState(1);
  const [lenM, setLenM] = useState(50);
  const [buffer, setBuffer] = useState(10);
  const [cfg, setCfg] = useState(1);
  const [restLast, setRest] = useState(false);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [running, setRunning] = useState(false);
  const [committed, setCommitted] = useState<Committed | null>(null);
  const [draft, setDraft] = useState("");
  const [, tick] = useState(0);

  const lastActive = useRef(-1);
  const doneFired = useRef(false);

  // hydrate from storage once
  useEffect(() => {
    (async () => {
      try {
        const keys = ["mode", "until", "lenH", "lenM", "buffer", "cfg", "restLast", "blocks", "muted", "running", "committed"];
        const pairs = await AsyncStorage.multiGet(keys.map((k) => `${KEY}.${k}`));
        const m: Record<string, any> = {};
        pairs.forEach(([k, v]) => { if (v != null) { try { m[k.replace(`${KEY}.`, "")] = JSON.parse(v); } catch {} } });
        if (m.mode) setMode(m.mode);
        if (typeof m.until === "string") setUntil(m.until);
        if (m.lenH != null) setLenH(m.lenH);
        if (m.lenM != null) setLenM(m.lenM);
        if (m.buffer != null) setBuffer(m.buffer);
        if (m.cfg != null) setCfg(m.cfg);
        if (m.restLast != null) setRest(m.restLast);
        if (Array.isArray(m.blocks)) setBlocks(m.blocks);
        if (m.muted != null) setMuted(m.muted);
        if (showLive && m.running != null) setRunning(m.running);
        if (showLive && m.committed) setCommitted(m.committed);
      } catch {}
      // default until +110m
      setUntil((u) => {
        if (u) return u;
        const d = addMin(new Date(), 110); d.setSeconds(0, 0);
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      });
      setHydrated(true);
    })();
  }, [showLive]);

  // persist after hydration
  useEffect(() => { if (hydrated) jset("mode", mode); }, [mode, hydrated]);
  useEffect(() => { if (hydrated) jset("until", until); }, [until, hydrated]);
  useEffect(() => { if (hydrated) jset("lenH", lenH); }, [lenH, hydrated]);
  useEffect(() => { if (hydrated) jset("lenM", lenM); }, [lenM, hydrated]);
  useEffect(() => { if (hydrated) jset("buffer", buffer); }, [buffer, hydrated]);
  useEffect(() => { if (hydrated) jset("cfg", cfg); }, [cfg, hydrated]);
  useEffect(() => { if (hydrated) jset("restLast", restLast); }, [restLast, hydrated]);
  useEffect(() => { if (hydrated) jset("blocks", blocks); }, [blocks, hydrated]);
  useEffect(() => { if (hydrated) jset("muted", muted); }, [muted, hydrated]);
  useEffect(() => { if (hydrated && showLive) jset("running", running); }, [running, hydrated, showLive]);
  useEffect(() => { if (hydrated && showLive) jset("committed", committed); }, [committed, hydrated, showLive]);

  useEffect(() => {
    const id = setInterval(() => { if (running && committed) tick((x) => x + 1); }, 1000);
    return () => clearInterval(id);
  }, [running, committed]);

  const win = usable({ mode, until, buffer, lenH, lenM });
  const Tm = win.usable;
  const c = CONFIGS[cfg];

  const chime = (kind: "handoff" | "done") => {
    if (muted) return;
    try {
      if (kind === "done") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 220);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  const addBlock = () => { const v = draft.trim(); if (!v) return; setBlocks((b) => [...b, v]); setDraft(""); };
  const moveUp = (i: number) => setBlocks((b) => { if (i <= 0) return b; const a = [...b]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; });

  const startRun = () => {
    if (Tm == null || !win.valid) return;
    const { segs, total, n } = buildSegments(c.work, c.brk, Tm, restLast, blocks);
    if (n === 0) return;
    lastActive.current = -1; doneFired.current = false;
    setCommitted({ startedAt: Date.now(), cfgName: c.name, work: c.work, brk: c.brk, segs, total, n });
    setRunning(true);
  };
  const stopRun = () => { setRunning(false); setCommitted(null); lastActive.current = -1; doneFired.current = false; };

  const rows = (Tm != null && win.valid) ? CONFIGS.map((cc, i) => ({ cc, i, r: compute(cc.work, cc.brk, Tm, restLast) })) : [];
  const maxFocus = rows.length ? Math.max(...rows.map((x) => x.r.focus)) : 0;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>PLAN THE WINDOW</Text>
      <Text style={s.h1}>Focus <Text style={{ color: T.gold }}>Window</Text></Text>
      <Text style={s.sub}>
        {showLive ? "Set when you have to stop, pick a style, load your tasks — then start the run and let it keep time."
          : showFitOnly ? "Set the time you've got. See how many focus sessions and breaks fit."
          : "Set when you have to stop. Load your tasks. Get a timed run."}
      </Text>

      {/* WINDOW */}
      <View style={s.card}>
        <Text style={s.lbl}>THE WINDOW</Text>
        <View style={s.segtog}>
          <Pressable style={[s.segbtn, mode === "until" && s.segOn]} onPress={() => setMode("until")}>
            <Text style={[s.segtxt, mode === "until" && s.segtxtOn]}>Until a time</Text></Pressable>
          <Pressable style={[s.segbtn, mode === "length" && s.segOn]} onPress={() => setMode("length")}>
            <Text style={[s.segtxt, mode === "length" && s.segtxtOn]}>For a length</Text></Pressable>
        </View>

        {mode === "until"
          ? <TimeEntry value={until} onChange={setUntil} />
          : <View style={s.row}>
              <Text style={s.hint}>I have</Text>
              <NumBox value={lenH} onChange={(n) => setLenH(Math.max(0, Math.min(24, n)))} /><Text style={s.hint}>h</Text>
              <NumBox value={lenM} onChange={(n) => setLenM(Math.max(0, Math.min(59, n)))} /><Text style={s.hint}>m</Text>
            </View>}

        <Text style={[s.lbl, { marginTop: 16, marginBottom: 9 }]}>BUFFER AT THE END</Text>
        <View style={s.chips}>
          {BUFFERS.map((b) => (
            <Pressable key={b} style={[s.chip, b === buffer && s.chipOn]} onPress={() => setBuffer(b)}>
              <Text style={[s.chiptxt, b === buffer && s.chiptxtOn]}>{b ? `${b}m` : "None"}</Text></Pressable>
          ))}
        </View>

        <Pressable style={s.toggle} onPress={() => setRest((v) => !v)}>
          <View style={[s.switch, restLast && s.switchOn]}><View style={[s.knob, restLast && s.knobOn]} /></View>
          <Text style={s.togtxt}>Rest after the last session too</Text>
        </Pressable>

        <Text style={[s.winline, win.expired && { color: T.clay }]}>
          {win.raw == null ? "Set a stop time to size the window."
            : win.expired ? "That time's already gone by today — pick a later one, or switch to For a length."
            : mode === "until"
              ? `Now → stop by ${clock(new Date(Date.now() + win.raw * 60000))}${buffer ? `, minus ${buffer}m buffer` : ""} = ${fmt(Tm!)} to work.`
              : `${fmt(Tm!)} to work${buffer ? ` (after a ${buffer}m buffer)` : ""}.`}
        </Text>
      </View>

      {/* STYLE chips (planner) */}
      {showStyleChips && (
        <View style={s.card}>
          <Text style={s.lbl}>SESSION STYLE</Text>
          <View style={s.chips}>
            {CONFIGS.map((cc, i) => (
              <Pressable key={i} style={[s.chip, i === cfg && s.chipOn]} onPress={() => setCfg(i)}>
                <Text style={[s.chiptxt, i === cfg && s.chiptxtOn]}>{cc.name} {cc.work}/{cc.brk}</Text></Pressable>
            ))}
          </View>
        </View>
      )}

      {/* COMPARE */}
      {(showCompare || showFitOnly) && (
        <>
          <Text style={s.sech}>Which style fits</Text>
          <Text style={s.sechsub}>{showFitOnly ? "Every style measured against your window." : "Every style measured against your window. Tap one to build the run."}</Text>
          {showLive && running && <Text style={s.lock}>Running — stop the run to change style.</Text>}
          {(Tm == null || !win.valid)
            ? <Text style={s.msg}>Set the window above to compare styles.</Text>
            : rows.map(({ cc, i, r }) => {
                const sel = i === cfg, best = r.focus > 0 && r.focus === maxFocus;
                const selectable = !showFitOnly && !(showLive && running);
                if (r.n === 0) return (
                  <View key={i} style={[s.res, { opacity: 0.55 }]}>
                    <Text style={s.cfgn}>{cc.name} <Text style={s.cfgsmall}>{cc.work}/{cc.brk}</Text></Text>
                    <Text style={s.none}>Won't fit a single {cc.work}-minute session.</Text></View>);
                return (
                  <Pressable key={i} disabled={!selectable} onPress={() => selectable && setCfg(i)}
                    style={[s.res, !showFitOnly && sel && s.resSel]}>
                    <View style={s.reshead}>
                      <Text style={s.cfgn}>{cc.name} <Text style={s.cfgsmall}>{cc.work}/{cc.brk}</Text></Text>
                      {!showFitOnly && sel
                        ? <View style={s.badgePlan}><Text style={s.badgePlanTxt}>PLANNING THIS</Text></View>
                        : best ? <View style={s.badgeBest}><Text style={s.badgeBestTxt}>MOST FOCUS</Text></View> : null}
                    </View>
                    <View style={s.stats}>
                      <StatRN v={String(r.n)} k="SESSIONS" />
                      <StatRN v={String(r.breaks)} k="BREAKS" dim={!r.breaks} />
                      <StatRN v={fmt(r.focus)} k="FOCUS" />
                      <StatRN v={r.spare ? fmt(r.spare) : "0m"} k="LEFT OVER" spare={!!r.spare} dim={!r.spare} />
                    </View>
                    <TimelineRN work={cc.work} brk={cc.brk} r={r} restLast={restLast} />
                  </Pressable>);
              })}
          <View style={s.legend}>
            <LegendRN c={T.work} label="Focus" /><LegendRN c={T.break} label="Break" /><LegendRN c={T.spare} label="Left over" />
          </View>
        </>
      )}

      {/* BLOCKS */}
      {showBlocks && (
        <>
          <Text style={s.sech}>Your blocks</Text>
          <Text style={s.sechsub}>What you want to get through. Top of the list runs first.</Text>
          <View style={s.card}>
            <View style={s.addrow}>
              <TextInput style={s.textInput} placeholder="What's a session for?" placeholderTextColor={T.sageDim}
                value={draft} onChangeText={setDraft} maxLength={80} returnKeyType="done" onSubmitEditing={addBlock} />
              <Pressable style={s.addbtn} onPress={addBlock}><Text style={s.addbtnTxt}>Add</Text></Pressable>
            </View>
            {blocks.length ? blocks.map((b, i) => (
              <View key={i} style={s.blockRow}>
                <Text style={s.idx}>{i + 1}</Text>
                <Text style={s.btxt}>{b}</Text>
                <Pressable style={[s.minib, i === 0 && { opacity: 0.3 }]} disabled={i === 0} onPress={() => moveUp(i)}><Text style={s.minibTxt}>▲</Text></Pressable>
                <Pressable style={s.minib} onPress={() => setBlocks((x) => x.filter((_, k) => k !== i))}><Text style={[s.minibTxt, { color: T.clay }]}>✕</Text></Pressable>
              </View>
            )) : <Text style={s.emptyb}>No blocks yet. Add tasks and they'll drop onto the sessions below.</Text>}
            {blocks.length ? (
              <View style={s.bfoot}>
                <Text style={s.held}>{blocks.length} held</Text>
                <Pressable onPress={() => setBlocks([])}><Text style={s.clearall}>Clear all</Text></Pressable>
              </View>) : null}
          </View>
        </>
      )}

      {/* PLAN / RUN */}
      {showPlan && (
        <>
          <Text style={s.sech}>The run</Text>
          <Text style={s.sechsub}>
            {showLive && running && committed ? `Running ${committed.cfgName} — locked to the clock.` : `Timed, using ${c.name} (${c.work}/${c.brk}).`}
          </Text>
          <View style={s.card}>
            {showLive && running && committed
              ? <LiveRunRN committed={committed} onStop={stopRun} muted={muted} setMuted={setMuted} chime={chime} lastActive={lastActive} doneFired={doneFired} />
              : <StaticPlanRN Tm={Tm} valid={win.valid} c={c} restLast={restLast} blocks={blocks} live={showLive} muted={muted} setMuted={setMuted} onStart={startRun} />}
          </View>
        </>
      )}

      <Text style={s.note}>
        {showLive
          ? "How it runs: Start locks the plan to the clock so it stops sliding; a live counter shows the block you're in and the time left, and a haptic pulse marks every hand-off. Stop returns you to planning."
          : "How it fills: sessions run back to back with a break between each; your blocks drop on in order, extras read open focus, and blocks that don't fit are flagged to carry forward."}
      </Text>
    </ScrollView>
  );
}

/* ---- small building blocks ---- */

function NumBox({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return <TextInput style={s.numBox} keyboardType="number-pad" value={value ? String(value) : ""}
    onChangeText={(t) => onChange(parseInt(t.replace(/\D/g, ""), 10) || 0)} />;
}

/** Hour(1-12) + Minute + AM/PM, stored back as "HH:MM" 24h so it feeds focusCore unchanged. */
function TimeEntry({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [H, M] = value ? value.split(":").map(Number) : [14, 0];
  const ampm = H >= 12 ? "PM" : "AM";
  let h12 = H % 12; if (h12 === 0) h12 = 12;
  const push = (h: number, m: number, ap: string) => {
    let hh = h % 12; if (ap === "PM") hh += 12; if (ap === "AM" && h === 12) hh = 0; if (ap === "PM" && h === 12) hh = 12;
    onChange(`${String(hh).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };
  return (
    <View style={s.row}>
      <Text style={s.hint}>Free until</Text>
      <NumBox value={h12} onChange={(n) => push(Math.max(1, Math.min(12, n || 12)), M, ampm)} />
      <Text style={s.hint}>:</Text>
      <NumBox value={M} onChange={(n) => push(h12, Math.max(0, Math.min(59, n)), ampm)} />
      <Pressable style={[s.chip, { marginLeft: 4 }]} onPress={() => push(h12, M, ampm === "AM" ? "PM" : "AM")}>
        <Text style={s.chiptxt}>{ampm}</Text></Pressable>
    </View>
  );
}

function StatRN({ v, k, spare, dim }: { v: string; k: string; spare?: boolean; dim?: boolean }) {
  return <View style={s.stat}><Text style={[s.statv, spare && { color: T.clay }, dim && { color: T.sageDim }]}>{v}</Text><Text style={s.statk}>{k}</Text></View>;
}
function LegendRN({ c, label }: { c: string; label: string }) {
  return <View style={s.legendItem}><View style={[s.sw, { backgroundColor: c }]} /><Text style={s.legendTxt}>{label}</Text></View>;
}
function TimelineRN({ work, brk, r, restLast }: { work: number; brk: number; r: ReturnType<typeof compute>; restLast: boolean }) {
  const segs: { c: string; flex: number }[] = [];
  for (let k = 0; k < r.n; k++) { segs.push({ c: T.work, flex: work }); const nb = restLast ? true : k < r.n - 1; if (nb && r.breaks > 0) segs.push({ c: T.break, flex: brk }); }
  if (r.spare > 0) segs.push({ c: T.spare, flex: r.spare });
  return <View style={s.tl}>{segs.map((sg, i) => <View key={i} style={{ flex: sg.flex, backgroundColor: sg.c }} />)}</View>;
}

function IconMute({ muted, setMuted }: { muted: boolean; setMuted: (f: (v: boolean) => boolean) => void }) {
  return <Pressable style={[s.iconbtn, !muted && s.iconOn]} onPress={() => setMuted((v) => !v)}><Text style={{ fontSize: 18 }}>{muted ? "🔕" : "🔔"}</Text></Pressable>;
}

function StaticPlanRN({ Tm, valid, c, restLast, blocks, live, muted, setMuted, onStart }: {
  Tm: number | null; valid: boolean; c: typeof CONFIGS[number]; restLast: boolean; blocks: string[];
  live: boolean; muted: boolean; setMuted: (f: (v: boolean) => boolean) => void; onStart: () => void;
}) {
  if (Tm == null || !valid) return <Text style={s.msg}>Set the window{live ? " and tap a style" : ""} to build the run.</Text>;
  const { n, breaks } = compute(c.work, c.brk, Tm, restLast);
  if (n === 0) return <Text style={s.msg}>{c.name} won't fit {fmt(Tm)}. Pick a shorter style.</Text>;
  let t = new Date(); const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const wEnd = addMin(t, c.work), label = blocks[i] ?? null;
    items.push(
      <View key={`w${i}`} style={s.planRow}>
        <Text style={s.ptime}>{clock(t)} – {clock(wEnd)}</Text>
        <View style={s.pbody}><View style={s.rowCenter}><View style={[s.dot, { backgroundColor: T.work }]} />
          <View><Text style={[s.blabel, !label && s.blabelOpen]}>{label ?? "Open focus"}</Text>
            <Text style={s.btag}>SESSION {i + 1} · {c.work}M</Text></View></View></View></View>);
    t = wEnd; const nb = restLast ? true : i < n - 1;
    if (nb) { const bEnd = addMin(t, c.brk);
      items.push(<View key={`b${i}`} style={s.planRow}><Text style={s.ptime}>{clock(t)} – {clock(bEnd)}</Text>
        <View style={s.pbody}><View style={s.rowCenter}><View style={[s.dot, { backgroundColor: T.break }]} />
          <Text style={s.bbreak}>Break · {c.brk}m</Text></View></View></View>); t = bEnd; }
  }
  const left = blocks.length - n;
  return (
    <>
      <Text style={s.psum}><Text style={{ color: T.gold }}>{n}</Text> session{n > 1 ? "s" : ""} · <Text style={{ color: T.gold }}>{breaks}</Text> break{breaks !== 1 ? "s" : ""} · <Text style={{ color: T.gold }}>{fmt(n * c.work)}</Text> focus · done by <Text style={{ color: T.gold }}>{clock(t)}</Text></Text>
      {items}
      {left > 0 && <View style={s.overflow}><Text style={s.overflowT}>{left} block{left > 1 ? "s" : ""} won't fit — carry into the next window:</Text>
        {blocks.slice(n).map((b, i) => <Text key={i} style={s.overflowLi}>• {b}</Text>)}</View>}
      {live && (
        <View style={s.runctrl}>
          <Pressable style={s.startbtn} onPress={onStart}><Text style={s.startbtnTxt}>▶  Start the run</Text></Pressable>
          <IconMute muted={muted} setMuted={setMuted} />
        </View>)}
    </>
  );
}

function LiveRunRN({ committed, onStop, muted, setMuted, chime, lastActive, doneFired }: {
  committed: Committed; onStop: () => void; muted: boolean;
  setMuted: (f: (v: boolean) => boolean) => void; chime: (k: "handoff" | "done") => void;
  lastActive: React.MutableRefObject<number>; doneFired: React.MutableRefObject<boolean>;
}) {
  const base = new Date(committed.startedAt);
  const elapsedMin = (Date.now() - committed.startedAt) / 60000;
  const idx = activeSegment(committed.segs, elapsedMin);
  const done = elapsedMin >= committed.total;

  useEffect(() => {
    if (done) { if (!doneFired.current) { doneFired.current = true; chime("done"); } return; }
    if (idx !== lastActive.current) { if (lastActive.current !== -1) chime("handoff"); lastActive.current = idx; }
  });

  let now: React.ReactNode;
  if (done) {
    now = <View style={[s.now, { borderColor: T.work }]}>
      <View style={s.nowtop}><Text style={[s.nowkind, { color: T.work }]}>WINDOW COMPLETE</Text>
        <Text style={s.nowclock}>{clock(base)} – {clock(addMin(base, committed.total))}</Text></View>
      <Text style={s.nowlabel}>That's the run.</Text>
      <Text style={s.nownext}>{fmt(committed.total)} clocked · {committed.segs.filter((x) => x.type === "work").length} sessions done.</Text></View>;
  } else {
    const sg = committed.segs[idx]; const remSec = (sg.m1 - elapsedMin) * 60;
    const prog = ((elapsedMin - sg.m0) / (sg.m1 - sg.m0)) * 100;
    const nxt = committed.segs[idx + 1];
    const nextTxt = nxt ? (nxt.type === "break" ? `Break · ${Math.round(nxt.m1 - nxt.m0)}m` : (nxt.label ?? `Session ${(nxt.idx ?? 0) + 1} · open focus`)) : "Nothing — window closes";
    now = (
      <View style={[s.now, sg.type === "break" && { borderColor: T.break }]}>
        <View style={s.nowtop}><Text style={[s.nowkind, sg.type === "break" && { color: T.break }]}>{sg.type === "break" ? "BREAK" : `FOCUS · SESSION ${(sg.idx ?? 0) + 1}`}</Text>
          <Text style={s.nowclock}>ends {clock(addMin(base, sg.m1))}</Text></View>
        <Text style={[s.nowlabel, sg.type === "work" && !sg.label && s.nowlabelOpen]}>{sg.type === "break" ? "Step back." : (sg.label ?? "Open focus")}</Text>
        <Text style={s.count}>{mmss(remSec)}<Text style={s.countSmall}>  left</Text></Text>
        <View style={s.prog}><View style={[s.progFill, { width: `${Math.min(100, Math.max(0, prog))}%` }]} /></View>
        <Text style={s.nownext}>Next — <Text style={{ color: T.cream, fontWeight: "600" }}>{nextTxt}</Text></Text>
      </View>);
  }

  return (
    <>
      {now}
      {committed.segs.map((sg, i) => {
        const past = elapsedMin >= sg.m1, active = elapsedMin >= sg.m0 && elapsedMin < sg.m1;
        return (
          <View key={i} style={[s.runRow, active && s.runRowActive]}>
            <Text style={[s.rltime, past && s.strike]}>{clock(addMin(base, sg.m0))}</Text>
            <View style={s.rowCenter}><View style={[s.dot, { backgroundColor: sg.type === "break" ? T.break : T.work }]} />
              {sg.type === "break"
                ? <Text style={s.rlsub}>Break · {Math.round(sg.m1 - sg.m0)}m</Text>
                : <Text style={[s.rllabel, active && { color: T.gold }, past && s.strike]}>{sg.label ?? "Open focus"}</Text>}
              {past && <Text style={s.check}>  ✓</Text>}</View>
          </View>);
      })}
      <View style={[s.runctrl, { marginTop: 12 }]}>
        <Pressable style={s.stopbtn} onPress={onStop}><Text style={s.stopbtnTxt}>{done ? "Done — clear" : "Stop the run"}</Text></Pressable>
        <IconMute muted={muted} setMuted={setMuted} />
      </View>
    </>
  );
}

/* ---------------- styles ---------------- */
const s = StyleSheet.create({
  screen: { backgroundColor: T.bg },
  content: { padding: 16, paddingBottom: 60, maxWidth: 640, width: "100%", alignSelf: "center" },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: T.goldDeep, fontWeight: "700", marginBottom: 6 },
  h1: { fontSize: 34, fontWeight: "700", color: T.cream, marginBottom: 8 },
  sub: { color: T.sage, fontSize: 14, marginBottom: 20 },
  sech: { fontSize: 20, fontWeight: "700", color: T.cream, marginTop: 24, marginBottom: 3 },
  sechsub: { color: T.sageDim, fontSize: 13, marginBottom: 12 },
  lock: { color: T.goldDeep, fontSize: 13, fontWeight: "600", marginBottom: 10 },
  card: { backgroundColor: T.panel, borderColor: T.line, borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 14 },
  lbl: { fontSize: 11, letterSpacing: 1.5, color: T.sage, fontWeight: "700", marginBottom: 12 },
  segtog: { flexDirection: "row", backgroundColor: T.bg2, borderColor: T.line, borderWidth: 1, borderRadius: 11, padding: 3, marginBottom: 14 },
  segbtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segOn: { backgroundColor: T.gold },
  segtxt: { color: T.sage, fontWeight: "600", fontSize: 14 }, segtxtOn: { color: T.ink },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: 9 },
  hint: { color: T.sageDim, fontSize: 13 },
  numBox: { backgroundColor: T.bg2, borderColor: T.line, borderWidth: 1, borderRadius: 11, color: T.cream, fontSize: 17, fontWeight: "600", paddingVertical: 10, paddingHorizontal: 12, minWidth: 60, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderColor: T.line, borderWidth: 1, backgroundColor: T.bg2, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  chipOn: { backgroundColor: T.gold, borderColor: T.gold },
  chiptxt: { color: T.cream, fontWeight: "600", fontSize: 14 }, chiptxtOn: { color: T.ink },
  toggle: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 16 },
  switch: { width: 44, height: 25, borderRadius: 999, backgroundColor: T.spare, borderColor: T.line, borderWidth: 1, justifyContent: "center" },
  switchOn: { backgroundColor: T.gold },
  knob: { width: 19, height: 19, borderRadius: 10, backgroundColor: T.cream, marginLeft: 2 }, knobOn: { marginLeft: 21 },
  togtxt: { color: T.sage, fontSize: 14 },
  winline: { fontSize: 14, color: T.sage, marginTop: 15 },
  res: { backgroundColor: T.panel2, borderColor: T.line, borderWidth: 1, borderRadius: 14, padding: 13, marginBottom: 10 },
  resSel: { borderColor: T.gold, borderWidth: 2 },
  reshead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cfgn: { color: T.cream, fontSize: 18, fontWeight: "600" }, cfgsmall: { color: T.sageDim, fontSize: 12, fontWeight: "600" },
  badgePlan: { backgroundColor: T.gold, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgePlanTxt: { color: T.ink, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  badgeBest: { borderColor: T.goldDeep, borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeBestTxt: { color: T.goldDeep, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  stats: { flexDirection: "row", gap: 16, marginVertical: 11, flexWrap: "wrap" },
  stat: { gap: 1 },
  statv: { fontSize: 22, fontWeight: "700", color: T.cream, ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums"] } : {}) },
  statk: { fontSize: 9, letterSpacing: 0.8, color: T.sageDim, fontWeight: "700" },
  tl: { flexDirection: "row", height: 12, borderRadius: 5, overflow: "hidden", backgroundColor: T.bg, borderColor: T.line, borderWidth: 1 },
  none: { color: T.sageDim, fontSize: 13, fontStyle: "italic", marginTop: 6 },
  legend: { flexDirection: "row", gap: 16, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  sw: { width: 13, height: 13, borderRadius: 3 }, legendTxt: { color: T.sage, fontSize: 12 },
  addrow: { flexDirection: "row", gap: 9 },
  textInput: { flex: 1, backgroundColor: T.bg2, borderColor: T.line, borderWidth: 1, borderRadius: 11, color: T.cream, fontSize: 15, paddingVertical: 11, paddingHorizontal: 13 },
  addbtn: { backgroundColor: T.gold, borderRadius: 11, justifyContent: "center", paddingHorizontal: 16 },
  addbtnTxt: { color: T.ink, fontWeight: "800", fontSize: 14 },
  blockRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.bg2, borderColor: T.line, borderWidth: 1, borderRadius: 11, paddingVertical: 9, paddingLeft: 12, paddingRight: 10, marginTop: 8 },
  idx: { color: T.goldDeep, fontWeight: "800", fontSize: 14, minWidth: 16 },
  btxt: { flex: 1, color: T.cream, fontSize: 15 },
  minib: { borderColor: T.line, borderWidth: 1, width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  minibTxt: { color: T.sage, fontSize: 15 },
  emptyb: { color: T.sageDim, fontSize: 14, fontStyle: "italic", marginTop: 13 },
  bfoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  held: { color: T.sageDim, fontSize: 12 },
  clearall: { color: T.sageDim, fontSize: 12, textDecorationLine: "underline" },
  psum: { color: T.sage, fontSize: 14, marginBottom: 14 },
  planRow: { flexDirection: "row", gap: 13 },
  ptime: { color: T.sage, fontSize: 12.5, minWidth: 118, paddingTop: 11, ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums"] } : {}) },
  pbody: { flex: 1, paddingVertical: 10, borderBottomColor: T.line, borderBottomWidth: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  blabel: { color: T.cream, fontSize: 15, fontWeight: "600" }, blabelOpen: { color: T.sageDim, fontStyle: "italic", fontWeight: "500" },
  btag: { fontSize: 10, letterSpacing: 0.8, color: T.sageDim, fontWeight: "700", marginTop: 1 },
  bbreak: { color: T.goldDeep, fontSize: 13, fontWeight: "600" },
  overflow: { backgroundColor: T.bg2, borderColor: T.clay, borderWidth: 1, borderStyle: "dashed", borderRadius: 12, padding: 12, marginTop: 14 },
  overflowT: { color: T.cream, fontSize: 13, fontWeight: "600" }, overflowLi: { color: T.cream, fontSize: 13, marginTop: 4 },
  msg: { color: T.sageDim, fontSize: 14, fontStyle: "italic", paddingVertical: 6 },
  runctrl: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 6 },
  startbtn: { flex: 1, backgroundColor: T.gold, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  startbtnTxt: { color: "#0A0A0A", fontWeight: "800", fontSize: 16 },
  stopbtn: { flex: 1, borderColor: T.line, borderWidth: 1, backgroundColor: T.bg2, borderRadius: 11, paddingVertical: 12, alignItems: "center" },
  stopbtnTxt: { color: T.sage, fontWeight: "700", fontSize: 14 },
  iconbtn: { borderColor: T.line, borderWidth: 1, backgroundColor: T.bg2, width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconOn: { borderColor: T.goldDeep },
  now: { backgroundColor: "#074128", borderColor: T.goldDeep, borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 14 },
  nowtop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  nowkind: { fontSize: 10.5, letterSpacing: 1.5, fontWeight: "800", color: T.gold },
  nowclock: { color: T.sage, fontSize: 12.5 },
  nowlabel: { color: T.cream, fontSize: 24, fontWeight: "600", marginBottom: 12 }, nowlabelOpen: { color: T.sage, fontStyle: "italic" },
  count: { color: T.cream, fontSize: 50, fontWeight: "700", ...(Platform.OS === "ios" ? { fontVariant: ["tabular-nums"] } : {}) },
  countSmall: { color: T.sage, fontSize: 16, fontWeight: "600" },
  prog: { height: 7, borderRadius: 4, backgroundColor: T.bg, borderColor: T.line, borderWidth: 1, overflow: "hidden", marginTop: 14, marginBottom: 10 },
  progFill: { height: "100%", backgroundColor: T.gold },
  nownext: { color: T.sage, fontSize: 14 },
  runRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8, borderBottomColor: T.line, borderBottomWidth: 1 },
  runRowActive: { backgroundColor: "rgba(242,176,30,0.06)", borderRadius: 9, paddingHorizontal: 8 },
  rltime: { color: T.sageDim, fontSize: 12.5, minWidth: 66, paddingTop: 2 },
  rllabel: { color: T.cream, fontSize: 15, fontWeight: "600" }, rlsub: { color: T.sageDim, fontSize: 12.5 },
  strike: { textDecorationLine: "line-through", color: T.sageDim },
  check: { color: T.work, fontWeight: "800", fontSize: 13 },
  note: { color: T.sageDim, fontSize: 12.5, lineHeight: 19, marginTop: 24, borderTopColor: T.line, borderTopWidth: 1, paddingTop: 14 },
});
