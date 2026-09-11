/**
 * The Focus Window shell.
 *
 * One island drives all four tools; the page sets `data-variant` on the root
 * and everything else follows from that. This is the same "one knob" design
 * the original toolkit used — the four tools are not four programs, they are
 * four depths of the same one:
 *
 *   fit       the window + the comparison. A calculator.
 *   planner   the window + blocks + a static timed plan.
 *   combined  the comparison becomes the dial that feeds the plan.
 *   live      combined, plus Start: locks to the clock and keeps time.
 *
 * All arithmetic lives in focusCore. Nothing below computes a schedule; it
 * only renders one and wires the controls.
 */
import {
  BUFFERS,
  CONFIGS,
  activeSegment,
  addMin,
  buildSegments,
  clock,
  compute,
  fmt,
  mmss,
  pad,
  usable,
  type Seg,
  type WindowState,
} from "../lib/focusCore";
import { PERSIST, get, set } from "../lib/store";
import * as chime from "../lib/chime";

type Variant = "fit" | "planner" | "combined" | "live";

const root = document.querySelector<HTMLElement>("[data-variant]");
if (root) {
  const variant = (root.dataset.variant ?? "live") as Variant;
  const showCompare = variant !== "planner";
  const compareIsDial = variant === "combined" || variant === "live";
  const showBlocks = variant !== "fit";
  const showPlan = variant !== "fit";
  const canRun = variant === "live";

  type Committed = {
    startedAt: number;
    cfgName: string;
    segs: Seg[];
    total: number;
    n: number;
  };

  const state = {
    mode: get<WindowState["mode"]>("mode", "until"),
    until: get("until", ""),
    buffer: get("buffer", 10),
    lenH: get("lenH", 1),
    lenM: get("lenM", 50),
    restLast: get("restLast", false),
    cfg: get("cfg", 1),
    blocks: get<string[]>("blocks", []),
    muted: get("muted", false),
    running: canRun ? get("running", false) : false,
    committed: canRun ? get<Committed | null>("committed", null) : null,
  };

  let lastActive = -1;
  let completedFired = false;

  const win = (): WindowState => ({
    mode: state.mode,
    until: state.until,
    buffer: state.buffer,
    lenH: state.lenH,
    lenM: state.lenM,
  });

  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
    );

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

  /* ---------- the window ---------- */

  function renderWindow(): void {
    for (const b of document.querySelectorAll<HTMLButtonElement>("#modeTog button")) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode));
    }
    const untilPane = $("untilPane");
    const lengthPane = $("lengthPane");
    if (untilPane) untilPane.hidden = state.mode !== "until";
    if (lengthPane) lengthPane.hidden = state.mode !== "length";

    const untilInput = $<HTMLInputElement>("untilInput");
    if (untilInput && document.activeElement !== untilInput) untilInput.value = state.until;

    const hh = $<HTMLInputElement>("hh");
    const mm = $<HTMLInputElement>("mm");
    if (hh && document.activeElement !== hh) hh.value = String(state.lenH);
    if (mm && document.activeElement !== mm) mm.value = String(state.lenM);

    for (const c of document.querySelectorAll<HTMLButtonElement>("#bufChips .chip")) {
      c.setAttribute("aria-pressed", String(Number(c.dataset.b) === state.buffer));
    }
    const rest = $("restToggle");
    if (rest) rest.setAttribute("aria-checked", String(state.restLast));

    const line = $("windowLine");
    if (!line) return;
    const u = usable(win());
    if (!u.valid && !u.expired) {
      line.className = "window-line";
      line.textContent = "Set a stop time to size the window.";
      return;
    }
    if (u.expired) {
      line.className = "window-line warn";
      line.innerHTML =
        "That time has already gone by today — pick a later one, or switch to <b>For a length</b>.";
      return;
    }
    line.className = "window-line";
    const mins = u.usable ?? 0;
    if (state.mode === "until") {
      const stop = addMin(new Date(), u.raw ?? 0);
      line.innerHTML = state.buffer
        ? `Now → stop by <b>${clock(stop)}</b>, minus ${state.buffer}m buffer = <b>${fmt(mins)}</b> to work.`
        : `Now → <b>${clock(stop)}</b> = <b>${fmt(mins)}</b> to work.`;
    } else {
      line.innerHTML = `<b>${fmt(mins)}</b> to work${state.buffer ? ` (after a ${state.buffer}m buffer)` : ""}.`;
    }
  }

  /* ---------- which style fits ---------- */

  function renderCompare(): void {
    const el = $("compare");
    if (!el) return;
    const lock = $("compareLock");
    if (lock) lock.hidden = !state.running;

    const T = usable(win()).usable;
    if (T === null) {
      el.innerHTML = `<p class="msg">Set the window above to compare styles.</p>`;
      return;
    }
    const rows = CONFIGS.map((c, i) => ({ c, i, r: compute(c.work, c.brk, T, state.restLast) }));
    const maxFocus = Math.max(...rows.map((x) => x.r.focus));

    el.innerHTML = rows
      .map(({ c, i, r }) => {
        if (r.n === 0) {
          return `<div class="res dead"><div class="res-head"><div class="cfg">${c.name} <small>${c.work}/${c.brk}</small></div></div><p class="none">Won't fit a single ${c.work}-minute session.</p></div>`;
        }
        let tl = "";
        for (let k = 0; k < r.n; k++) {
          tl += `<div class="seg w" style="flex:${c.work}"></div>`;
          const hasBreak = state.restLast ? true : k < r.n - 1;
          if (hasBreak && r.breaks > 0) tl += `<div class="seg b" style="flex:${c.brk}"></div>`;
        }
        if (r.spare > 0) tl += `<div class="seg s" style="flex:${r.spare}"></div>`;

        const selected = compareIsDial && i === state.cfg;
        const badge = selected
          ? `<span class="badge plan">Planning this</span>`
          : r.focus > 0 && r.focus === maxFocus
            ? `<span class="badge best">Most focus</span>`
            : "";

        const body = `<div class="res-head"><div class="cfg">${c.name} <small>${c.work}/${c.brk}</small></div>${badge}</div>
        <div class="stats">
          <div class="stat"><span class="v">${r.n}</span><span class="k">Sessions</span></div>
          <div class="stat"><span class="v ${r.breaks ? "" : "zero"}">${r.breaks}</span><span class="k">Breaks</span></div>
          <div class="stat"><span class="v">${fmt(r.focus)}</span><span class="k">Focus</span></div>
          <div class="stat"><span class="v spare ${r.spare ? "" : "zero"}">${r.spare ? fmt(r.spare) : "0m"}</span><span class="k">Left over</span></div>
        </div>
        <div class="tl">${tl}</div>`;

        // Only the dial variants are interactive — in Fit the cards are a
        // readout, and a button that does nothing is worse than a div.
        return compareIsDial
          ? `<button type="button" class="res" data-i="${i}" aria-pressed="${selected}">${body}</button>`
          : `<div class="res">${body}</div>`;
      })
      .join("");
  }

  /* ---------- blocks ---------- */

  function renderBlocks(): void {
    const ul = $("blockList");
    if (!ul) return;
    ul.innerHTML = state.blocks
      .map(
        (b, i) =>
          `<li><span class="idx">${i + 1}</span><span class="txt">${esc(b)}</span>` +
          `<button class="mini" data-up="${i}"${i === 0 ? " disabled" : ""} aria-label="Move &quot;${esc(b)}&quot; up">↑</button>` +
          `<button class="mini del" data-del="${i}" aria-label="Remove &quot;${esc(b)}&quot;">✕</button></li>`
      )
      .join("");

    const empty = $("emptyBlocks");
    if (empty) empty.hidden = state.blocks.length > 0;
    const clear = $("clearAll");
    if (clear) clear.hidden = state.blocks.length === 0;

    const held = $("heldNote");
    if (!held) return;
    if (!state.blocks.length) {
      held.textContent = "";
      held.className = "held";
    } else if (PERSIST) {
      held.textContent = `${state.blocks.length} held`;
      held.className = "held";
    } else {
      held.textContent = `${state.blocks.length} added · won't persist here`;
      held.className = "held warn";
    }
  }

  /* ---------- the plan, and the run ---------- */

  function renderPlan(): void {
    const card = $("runCard");
    if (!card) return;

    if (canRun && state.running && state.committed) {
      renderRunning(card, state.committed);
      const sub = $("runSub");
      if (sub) sub.textContent = `Running ${state.committed.cfgName} — locked to the clock.`;
      return;
    }

    const c = CONFIGS[state.cfg] ?? CONFIGS[1]!;
    const sub = $("runSub");
    if (sub) sub.textContent = `Timed, using ${c.name} (${c.work}/${c.brk}).`;

    const T = usable(win()).usable;
    if (T === null) {
      card.innerHTML = `<p class="msg">Set the window${compareIsDial ? " and tap a style" : ""} to build the plan.</p>`;
      return;
    }
    const { n, breaks } = compute(c.work, c.brk, T, state.restLast);
    if (n === 0) {
      card.innerHTML = `<p class="msg">${c.name} won't fit ${fmt(T)}. ${compareIsDial ? "Tap a shorter style above." : "Lengthen the window."}</p>`;
      return;
    }

    let t = new Date();
    const rows: string[] = [];
    for (let i = 0; i < n; i++) {
      const wEnd = addMin(t, c.work);
      const label = state.blocks[i] ?? null;
      rows.push(
        `<li><div class="time">${clock(t)} <span class="to">– ${clock(wEnd)}</span></div>` +
          `<div class="pbody"><div class="b-work"><span class="dot w"></span><div>` +
          `<div class="b-label ${label ? "" : "open"}">${label ? esc(label) : "Open focus"}</div>` +
          `<div class="b-tag">Session ${i + 1} · ${c.work}m</div></div></div></div></li>`
      );
      t = wEnd;
      const hasBreak = state.restLast ? true : i < n - 1;
      if (hasBreak) {
        const bEnd = addMin(t, c.brk);
        rows.push(
          `<li><div class="time">${clock(t)} <span class="to">– ${clock(bEnd)}</span></div>` +
            `<div class="pbody"><div class="b-break"><span class="dot b"></span>Break · ${c.brk}m</div></div></li>`
        );
        t = bEnd;
      }
    }

    let over = "";
    const left = state.blocks.length - n;
    if (left > 0) {
      over = `<div class="overflow"><b>${left} block${left > 1 ? "s" : ""} won't fit this window</b> — carry into the next one:<ul>${state.blocks
        .slice(n)
        .map((b) => `<li>${esc(b)}</li>`)
        .join("")}</ul></div>`;
    } else if (state.blocks.length > 0 && state.blocks.length < n) {
      const spare = n - state.blocks.length;
      over = `<div class="overflow calm">${spare} open session${spare > 1 ? "s" : ""} past your list — spare focus, or add more blocks.</div>`;
    }

    const controls = canRun
      ? `<div class="run-ctrl"><button class="start-btn" id="startBtn" type="button">▶ Start the run</button>` +
        `<button class="icon-btn" id="muteBtn" type="button" aria-pressed="${!state.muted}" aria-label="${state.muted ? "Unmute the chime" : "Mute the chime"}">${state.muted ? "🔕" : "🔔"}</button></div>`
      : "";

    card.innerHTML =
      `<p class="plan-sum"><b>${n}</b> session${n > 1 ? "s" : ""} · <b>${breaks}</b> break${breaks !== 1 ? "s" : ""} · <b>${fmt(n * c.work)}</b> focus · done by <b>${clock(t)}</b></p>` +
      `<ol class="plan">${rows.join("")}</ol>${over}${controls}`;

    $("startBtn")?.addEventListener("click", startRun);
    $("muteBtn")?.addEventListener("click", toggleMute);
  }

  function renderRunning(card: HTMLElement, cm: Committed): void {
    const base = new Date(cm.startedAt);
    const elapsedMin = (Date.now() - cm.startedAt) / 60000;
    const idx = activeSegment(cm.segs, elapsedMin);
    const done = elapsedMin >= cm.total;

    if (done) {
      if (!completedFired) {
        completedFired = true;
        chime.complete(state.muted);
      }
    } else if (idx !== lastActive) {
      if (lastActive !== -1) chime.handoff(state.muted);
      lastActive = idx;
    }

    let nowHtml: string;
    if (done || idx === -1) {
      const sessions = cm.segs.filter((s) => s.type === "work").length;
      nowHtml =
        `<div class="now done"><div class="now-top"><span class="now-kind">Window complete</span>` +
        `<span class="now-clock">${clock(base)} – ${clock(addMin(base, cm.total))}</span></div>` +
        `<div class="now-label">That's the run.</div>` +
        `<div class="now-next">${fmt(cm.total)} clocked · ${sessions} session${sessions === 1 ? "" : "s"} done.</div></div>`;
    } else {
      const s = cm.segs[idx]!;
      const remSec = (s.m1 - elapsedMin) * 60;
      const progress = ((elapsedMin - s.m0) / (s.m1 - s.m0)) * 100;
      const next = cm.segs[idx + 1];
      const nextTxt = next
        ? next.type === "break"
          ? `Break · ${Math.round(next.m1 - next.m0)}m`
          : next.label
            ? esc(next.label)
            : `Session ${(next.idx ?? 0) + 1} · open focus`
        : "Nothing — the window closes";

      const isWork = s.type === "work";
      nowHtml =
        `<div class="now ${isWork ? "" : "break"}"><div class="now-top">` +
        `<span class="now-kind">${isWork ? `Focus · Session ${(s.idx ?? 0) + 1}` : "Break"}</span>` +
        `<span class="now-clock">ends ${clock(addMin(base, s.m1))}</span></div>` +
        `<div class="now-label ${isWork && !s.label ? "open" : ""}">${isWork ? (s.label ? esc(s.label) : "Open focus") : "Step back."}</div>` +
        `<div class="count" role="timer" aria-live="off">${mmss(remSec)}<small>left</small></div>` +
        `<div class="prog"><i style="width:${progress}%"></i></div>` +
        `<div class="now-next">Next — <b>${nextTxt}</b></div></div>`;
    }

    const list = cm.segs
      .map((s) => {
        const past = elapsedMin >= s.m1;
        const active = elapsedMin >= s.m0 && elapsedMin < s.m1;
        const cls = past ? "past" : active ? "active" : "";
        const time = clock(addMin(base, s.m0));
        if (s.type === "break") {
          return `<li class="${cls}"><span class="rl-time">${time}</span><div class="rl-body"><span class="dot b"></span><span class="rl-sub">Break · ${Math.round(s.m1 - s.m0)}m</span>${past ? '<span class="check">✓</span>' : ""}</div></li>`;
        }
        return `<li class="${cls}"><span class="rl-time">${time}</span><div class="rl-body"><span class="dot w"></span><span class="rl-label">${s.label ? esc(s.label) : "Open focus"}</span>${past ? '<span class="check">✓</span>' : ""}</div></li>`;
      })
      .join("");

    card.innerHTML =
      nowHtml +
      `<ul class="run-list">${list}</ul>` +
      `<div class="run-ctrl"><button class="stop-btn" id="stopBtn" type="button">${done ? "Done — clear" : "Stop the run"}</button>` +
      `<button class="icon-btn" id="muteBtn" type="button" aria-pressed="${!state.muted}" aria-label="${state.muted ? "Unmute the chime" : "Mute the chime"}">${state.muted ? "🔕" : "🔔"}</button></div>`;

    $("stopBtn")?.addEventListener("click", stopRun);
    $("muteBtn")?.addEventListener("click", toggleMute);
  }

  function startRun(): void {
    const c = CONFIGS[state.cfg] ?? CONFIGS[1]!;
    const T = usable(win()).usable;
    if (T === null) return;
    const { segs, total, n } = buildSegments(c.work, c.brk, T, state.restLast, state.blocks);
    if (n === 0) return;

    chime.unlock(); // called from the click, which is the only time it is allowed
    state.committed = { startedAt: Date.now(), cfgName: c.name, segs, total, n };
    state.running = true;
    lastActive = -1;
    completedFired = false;
    set("committed", state.committed);
    set("running", true);
    render();
    $("runCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stopRun(): void {
    state.running = false;
    state.committed = null;
    lastActive = -1;
    completedFired = false;
    set("running", false);
    set("committed", null);
    render();
  }

  function toggleMute(): void {
    state.muted = !state.muted;
    set("muted", state.muted);
    renderPlan();
  }

  function render(): void {
    renderWindow();
    if (showCompare) renderCompare();
    if (showBlocks) renderBlocks();
    if (showPlan) renderPlan();
  }

  /* ---------- wiring ---------- */

  const bufChips = $("bufChips");
  if (bufChips) {
    bufChips.innerHTML = BUFFERS.map(
      (b) => `<button type="button" class="chip" data-b="${b}" aria-pressed="false">${b ? b + "m" : "None"}</button>`
    ).join("");
    bufChips.addEventListener("click", (e) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>(".chip");
      if (!chip) return;
      state.buffer = Number(chip.dataset.b);
      set("buffer", state.buffer);
      render();
    });
  }

  $("modeTog")?.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("button");
    if (!b?.dataset.mode) return;
    state.mode = b.dataset.mode as WindowState["mode"];
    set("mode", state.mode);
    render();
  });

  $<HTMLInputElement>("untilInput")?.addEventListener("input", (e) => {
    state.until = (e.target as HTMLInputElement).value;
    set("until", state.until);
    render();
  });

  $<HTMLInputElement>("hh")?.addEventListener("input", (e) => {
    state.lenH = Math.max(0, Math.min(24, Number((e.target as HTMLInputElement).value) || 0));
    set("lenH", state.lenH);
    render();
  });

  $<HTMLInputElement>("mm")?.addEventListener("input", (e) => {
    state.lenM = Math.max(0, Math.min(59, Number((e.target as HTMLInputElement).value) || 0));
    set("lenM", state.lenM);
    render();
  });

  const rest = $("restToggle");
  rest?.addEventListener("click", () => {
    state.restLast = !state.restLast;
    set("restLast", state.restLast);
    render();
  });

  $("compare")?.addEventListener("click", (e) => {
    if (!compareIsDial || state.running) return;
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".res[data-i]");
    if (!btn) return;
    state.cfg = Number(btn.dataset.i);
    set("cfg", state.cfg);
    render();
  });

  const blockInput = $<HTMLInputElement>("blockInput");
  function addBlock(): void {
    const v = blockInput?.value.trim();
    if (!v) return;
    state.blocks.push(v);
    set("blocks", state.blocks);
    blockInput!.value = "";
    blockInput!.focus();
    render();
  }
  $("addBtn")?.addEventListener("click", addBlock);
  blockInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addBlock();
    }
  });

  $("blockList")?.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const del = t.closest<HTMLElement>("[data-del]");
    const up = t.closest<HTMLElement>("[data-up]");
    if (del) {
      state.blocks.splice(Number(del.dataset.del), 1);
    } else if (up) {
      const i = Number(up.dataset.up);
      if (i > 0) {
        const prev = state.blocks[i - 1]!;
        state.blocks[i - 1] = state.blocks[i]!;
        state.blocks[i] = prev;
      }
    } else return;
    set("blocks", state.blocks);
    render();
  });

  $("clearAll")?.addEventListener("click", () => {
    state.blocks = [];
    set("blocks", state.blocks);
    render();
  });

  // A sensible first window so the page is never empty on arrival.
  if (state.mode === "until" && !state.until) {
    const d = addMin(new Date(), 110);
    d.setSeconds(0, 0);
    state.until = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  render();

  // One loop. A live run ticks every second; while planning, the "until"
  // window quietly shrinks as real time passes, so it refreshes every 30s —
  // but never while a field is focused, which would fight the typing.
  let tick = 0;
  setInterval(() => {
    if (canRun && state.running && state.committed) {
      renderPlan();
      return;
    }
    tick++;
    if (tick % 30 === 0 && !document.querySelector("input:focus")) {
      renderWindow();
      if (showCompare) renderCompare();
      if (showPlan) renderPlan();
    }
  }, 1000);
}
