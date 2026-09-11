/**
 * focusCore contract.
 *
 * The shell can be rebuilt; the arithmetic is the thing that must not drift.
 * These are the invariants the original toolkit's README stated as verified,
 * now actually asserted — plus a check that the palette still traces to the
 * brand anchors and clears WCAG AA on the surfaces it is painted on.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";

const here = dirname(fileURLToPath(import.meta.url));

/* --- load focusCore by transpiling it; no build step, no duplicate copy --- */
const src = readFileSync(join(here, "..", "src", "lib", "focusCore.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

const fail = [];
let checks = 0;
const is = (label, got, want) => {
  checks++;
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) fail.push(`${label}: got ${g}, expected ${w}`);
};

/* --- compute: max sessions that fit T minutes --- */
// Classic 25/5 in 60m: 25 + 5 + 25 = 55, so two sessions and one break.
is("compute 25/5 in 60 → n", core.compute(25, 5, 60, false).n, 2);
is("compute 25/5 in 60 → breaks", core.compute(25, 5, 60, false).breaks, 1);
is("compute 25/5 in 60 → spare", core.compute(25, 5, 60, false).spare, 5);

// The trailing break is dropped unless restLast — that is what lets a third
// session fit in 85 minutes (25+5+25+5+25 = 85) rather than stopping at two.
is("trailing break dropped", core.compute(25, 5, 85, false).n, 3);
is("restLast keeps it", core.compute(25, 5, 85, true).n, 2);

// Degenerate inputs must not produce negative or NaN plans.
is("zero window", core.compute(25, 5, 0, false), { n: 0, breaks: 0, focus: 0, used: 0, spare: 0 });
is("negative window", core.compute(25, 5, -30, false).n, 0);
is("zero work length", core.compute(0, 5, 60, false).n, 0);
is("window shorter than one session", core.compute(90, 20, 45, false).n, 0);

// used never exceeds the window.
for (const T of [17, 45, 60, 91, 200, 480]) {
  for (const c of core.CONFIGS) {
    const r = core.compute(c.work, c.brk, T, false);
    checks++;
    if (r.used > T) fail.push(`${c.name} in ${T}m: used ${r.used} exceeds the window`);
    if (r.focus + r.breaks * c.brk !== r.used) fail.push(`${c.name} in ${T}m: focus+breaks !== used`);
    if (Math.abs(r.used + r.spare - T) > 1e-9) fail.push(`${c.name} in ${T}m: used+spare !== T`);
  }
}

/* --- buildSegments: the timed skeleton --- */
const built = core.buildSegments(25, 5, 85, false, ["a", "b"]);
is("segments for 3 sessions", built.segs.length, 5); // w b w b w
is("segment total", built.total, 85);
is("blocks land in order", built.segs.filter((s) => s.type === "work").map((s) => s.label), ["a", "b", null]);
is("segments are contiguous", built.segs.every((s, i) => i === 0 || s.m0 === built.segs[i - 1].m1), true);

const restBuilt = core.buildSegments(25, 5, 85, true, []);
is("restLast ends on a break", restBuilt.segs.at(-1).type, "break");

/* --- activeSegment --- */
is("active at start", core.activeSegment(built.segs, 0), 0);
is("active mid-first-session", core.activeSegment(built.segs, 24.9), 0);
is("active at the boundary is the next", core.activeSegment(built.segs, 25), 1);
is("active past the end is none", core.activeSegment(built.segs, 999), -1);

/* --- usable: the buffer, and the expired case --- */
is("length mode subtracts the buffer", core.usable({ mode: "length", until: "", buffer: 10, lenH: 1, lenM: 0 }).usable, 50);
is("buffer cannot go negative", core.usable({ mode: "length", until: "", buffer: 90, lenH: 0, lenM: 30 }).usable, 0);
is("no time set is not valid", core.usable({ mode: "until", until: "", buffer: 0, lenH: 0, lenM: 0 }).valid, false);

/* --- formatting --- */
is("fmt 95", core.fmt(95), "1h 35m");
is("fmt 60", core.fmt(60), "1h");
is("fmt 45", core.fmt(45), "45m");
is("mmss 125", core.mmss(125), "2:05");
is("mmss clamps negatives", core.mmss(-10), "0:00");

/* --- the palette still traces to the brand --- */
const css = readFileSync(join(here, "..", "src", "styles", "site.css"), "utf8");
checks++;
if (!css.includes('@import "@ujg/brand/tokens.css"')) {
  fail.push("site.css no longer imports the brand tokens");
}
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const f = (c) => ((c /= 255), c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const [r, g, b] = rgb(h);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const tok = {};
for (const m of css.matchAll(/(--f-[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})/gi)) tok[m[1]] = m[2];

const SURFACES = ["--f-ground", "--f-deep", "--f-panel", "--f-panel-hi"];
// Text answers to WCAG 1.4.3 at 4.5:1. Bars, dots and the switch track are
// non-text UI components and answer to 1.4.11 at 3:1 — checked, at their own
// threshold, rather than exempted.
const TEXT = ["--f-ink", "--f-ink-2", "--f-ink-3", "--f-gold", "--f-gold-deep", "--f-clay", "--f-work-ink", "--f-break"];
const GRAPHIC = ["--f-work", "--f-spare", "--f-line"];
let worst = { r: Infinity };
for (const [tokens, min, kind] of [[TEXT, 4.5, "text"], [GRAPHIC, 3, "graphic"]]) {
  for (const t of tokens) {
    for (const s of SURFACES) {
      if (!tok[t] || !tok[s]) continue;
      checks++;
      const r = ratio(tok[t], tok[s]);
      if (kind === "text" && r < worst.r) worst = { r, t, s };
      if (r < min) fail.push(`${kind} ${t} (${tok[t]}) on ${s} (${tok[s]}) is ${r.toFixed(2)}:1, needs ${min}:1`);
    }
  }
}

if (fail.length) {
  console.error(`focusCore — ${fail.length} failure(s):\n`);
  for (const f of fail) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(
  `focusCore — ${checks} assertions pass. Schedules never exceed their window, ` +
    `the trailing break is dropped unless asked for, and every text token clears ` +
    `4.5:1 on every surface (tightest ${worst.r.toFixed(2)}:1 — ${worst.t} on ${worst.s}).`
);
