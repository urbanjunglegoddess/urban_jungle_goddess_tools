// Proves every colour in the toolkit is either a UJG system colour or one of the
// five documented derived steps. Run from work-assist/real:
//   node scripts/verify-palette.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || '.';

const hex = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const Y = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a, b) => { const x = Y(a), y = Y(b), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };
const mix = (a, b, t) => '#' + [0, 1, 2].map((i) => Math.round(hex(a)[i] * (1 - t) + hex(b)[i] * t).toString(16).padStart(2, '0')).join('').toUpperCase();
const f = (n) => n.toFixed(2);

const SYSTEM = {
  '#0A0A0A': 'Night', '#47107D': 'Deep Amethyst', '#D9531A': 'Sunset Ember',
  '#F2B01E': 'Luminous Gold', '#0D5E39': 'Rich Forest', '#E8E6E1': 'Platinum',
  '#A8A5A0': 'Muted Platinum', '#2E6B4F': 'Rich Jungle Green', '#042F1E': 'Midnight Forest',
  '#C15C27': 'Clay Ember', '#E1A443': 'Harvest Gold', '#587156': 'Sage',
  '#E28D1F': 'Marigold', '#F7DFC0': 'Warm Sand', '#B04720': 'Terracotta',
};
const DERIVED = {
  [mix('#0A0A0A', '#042F1E', 0.55)]: 'surface-1  Night -> Midnight Forest 55%',
  [mix('#042F1E', '#0D5E39', 0.30)]: 'surface-2  Midnight Forest -> Rich Forest 30%',
  [mix('#042F1E', '#0D5E39', 0.38)]: 'surface-3  Midnight Forest -> Rich Forest 38%',
  [mix('#042F1E', '#0D5E39', 0.45)]: 'surface-4  Midnight Forest -> Rich Forest 45%',
  [mix('#A8A5A0', '#587156', 0.30)]: 'text-dim   Muted Platinum -> Sage 30%',
};

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'scripts' && e.name !== 'node_modules') walk(p); }
    else if (/\.(css|ts|tsx|html)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const found = new Map();
for (const file of files) {
  const body = fs.readFileSync(file, 'utf8');
  for (const m of body.match(/#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}/g) || []) {
    const up = m.toUpperCase();
    if (!found.has(up)) found.set(up, new Set());
    found.get(up).add(path.relative(ROOT, file));
  }
}

let bad = 0;
console.log('PALETTE PROVENANCE\n');
console.log('  colour        origin');
for (const c of [...found.keys()].sort()) {
  const base = c.length === 9 ? c.slice(0, 7) : c;      // strip alpha
  const alpha = c.length === 9 ? ` (alpha ${c.slice(7)})` : '';
  if (SYSTEM[base]) console.log(`  ${c.padEnd(12)}  UJG system: ${SYSTEM[base]}${alpha}`);
  else if (DERIVED[base]) console.log(`  ${c.padEnd(12)}  derived   : ${DERIVED[base]}${alpha}`);
  else { console.log(`  ${c.padEnd(12)}  UNTRACED  <- not a system colour or documented derivation`); bad++; }
}

const sys = [...found.keys()].filter((c) => SYSTEM[c.length === 9 ? c.slice(0, 7) : c]).length;
console.log(`\n  ${found.size} distinct colours: ${sys} system, ${found.size - sys - bad} derived, ${bad} untraced`);

// contrast spot-checks against the values actually in the files
const T = {
  bg: '#0A0A0A', bg2: mix('#0A0A0A', '#042F1E', 0.55), panel: '#042F1E',
  panel2: mix('#042F1E', '#0D5E39', 0.30), cream: '#F7DFC0', sage: '#A8A5A0',
  sageDim: mix('#A8A5A0', '#587156', 0.30), gold: '#F2B01E', goldDeep: '#E1A443',
  clay: '#E28D1F', work: '#2E6B4F', brk: '#E1A443', spare: '#587156',
};
const PAIRS = [
  ['body text on page', T.cream, T.bg, 4.5], ['body text on card', T.cream, T.panel, 4.5],
  ['secondary on card', T.sage, T.panel, 4.5], ['tertiary on card', T.sageDim, T.panel, 4.5],
  ['eyebrow on page', T.goldDeep, T.bg, 4.5], ['accent on card', T.gold, T.panel, 4.5],
  ['warning on card', T.clay, T.panel, 4.5], ['input text on inset', T.cream, T.bg2, 4.5],
  ['placeholder on inset', T.sageDim, T.bg2, 4.5], ['section sub on page', T.sageDim, T.bg, 4.5],
  ['now-label on card', T.cream, T.panel2, 3.0], ['ink on gold', T.bg, T.gold, 4.5],
  ['work seg on page', T.work, T.bg, 3.0], ['break seg on page', T.brk, T.bg, 3.0],
  ['spare seg on page', T.spare, T.bg, 3.0],
];
console.log('\n\nCONTRAST (WCAG 2.1 AA)\n');
let fails = 0;
for (const [label, fg, bg, req] of PAIRS) {
  const c = cr(fg, bg);
  if (c < req) fails++;
  console.log(`  ${c < req ? 'FAIL' : 'pass'}  ${f(c).padStart(6)}  (need ${req.toFixed(1)})  ${label}`);
}
console.log(`\n  ${fails} failure(s) of ${PAIRS.length}`);

console.log('\n\nKNOWN LIMIT — timeline fills cannot be mutually 3:1\n');
for (const [x, y, a, b] of [['work', 'break', T.work, T.brk], ['work', 'spare', T.work, T.spare], ['break', 'spare', T.brk, T.spare]])
  console.log(`  ${(x + ' / ' + y).padEnd(14)} ${f(cr(a, b))}`);
console.log('\n  Three opaque fills each 3:1 apart AND 3:1 above a near-black ground needs');
console.log('  luminances ~0.10 / 0.35 / 1.2 — the last is brighter than white. No palette');
console.log('  satisfies this. The hatch on --spare and the labelled legend carry the');
console.log('  distinction instead; both predate this retheme.');

// web/focus-window.css declares tokens as var(--ujg-*, <fallback>). If the shipped
// system stylesheet is reachable, every reference must exist in it and every fallback
// must equal the system value — otherwise the tool renders differently depending on
// whether ujg-colors.css happens to be loaded.
const SYS = path.resolve(ROOT, '../../colors/ujg-color-system/web/ujg-colors.css');
let linkBad = 0;
if (fs.existsSync(SYS)) {
  const sys = fs.readFileSync(SYS, 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'web/focus-window.css'), 'utf8');
  const decl = new Map();
  for (const m of sys.matchAll(/^\s*(--ujg-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/gm))
    decl.set(m[1], m[2].toUpperCase());
  const refs = [...css.matchAll(/var\((--ujg-[a-z0-9-]+),\s*(#[0-9A-Fa-f]{6})\)/g)];
  console.log('\n\nSYSTEM LINKAGE  (web/focus-window.css -> ujg-colors.css)\n');
  const seen = new Set();
  for (const [, name, fallback] of refs) {
    if (seen.has(name)) continue;
    seen.add(name);
    const sysVal = decl.get(name);
    const okName = sysVal !== undefined;
    const okVal = okName && sysVal === fallback.toUpperCase();
    if (!okName || !okVal) linkBad++;
    console.log(`  ${okName && okVal ? 'ok   ' : 'BROKEN'} ${name.padEnd(26)} fallback ${fallback.toUpperCase()}  system ${sysVal ?? 'NOT DECLARED'}`);
  }
  console.log(`\n  ${seen.size} references, ${linkBad} broken`);
} else {
  console.log('\n\nSYSTEM LINKAGE  skipped — ujg-colors.css not found at ' + SYS);
}

process.exit(bad || fails || linkBad ? 1 : 0);
