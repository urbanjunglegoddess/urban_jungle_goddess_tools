/**
 * @ujg/brand contrast contract.
 *
 * The palette failed WCAG AA on its muted text in both themes — quietly, in
 * the original single-file guide, for every card on the page. This test exists
 * so it cannot come back: every ink/accent token is checked against every
 * surface it is actually painted on, in both themes.
 *
 * The seven brand anchors are deliberately NOT constrained here. They are the
 * identity; the derived semantic tokens are what has to clear AA.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "tokens.css"), "utf8");

function block(open) {
  const at = css.indexOf(open);
  if (at === -1) throw new Error(`verify-contrast: block not found — ${open}`);
  let depth = 0, start = -1;
  for (let i = at; i < css.length; i++) {
    if (css[i] === "{") { depth++; if (depth === 1) start = i + 1; }
    else if (css[i] === "}") { depth--; if (depth === 0) return css.slice(start, i); }
  }
  throw new Error("verify-contrast: unbalanced braces");
}
const vars = (t) => {
  const m = new Map();
  for (const x of t.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) m.set(x[1], x[2].trim());
  return m;
};

const base = vars(block(":root {"));
const light = new Map(base);
for (const [k, v] of vars(block(':root[data-theme="light"]'))) light.set(k, v);

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = rgb(h);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Text tokens, and the surfaces each is actually painted on in this app. */
const SURFACES = ["--ground", "--surface", "--surface-2", "--mark-soft"];
const TEXT = ["--ink", "--ink-2", "--ink-3", "--accent", "--accent-2", "--mark", "--ok", "--warn", "--off", "--ceil"];

/** AA for normal text. The guide sets muted labels at 9–11px, so AA-large never applies. */
const MIN = 4.5;

const problems = [];
let checks = 0;
let worst = { r: Infinity };

for (const [theme, palette] of [["dark", base], ["light", light]]) {
  for (const t of TEXT) {
    const fg = palette.get(t);
    if (!fg?.startsWith("#")) continue;
    for (const s of SURFACES) {
      const bg = palette.get(s);
      if (!bg?.startsWith("#")) continue;
      // --mark-soft only ever carries --mark and --ink-3 in this app.
      if (s === "--mark-soft" && !["--mark", "--ink-3", "--ink", "--ink-2"].includes(t)) continue;
      checks++;
      const r = ratio(fg, bg);
      if (r < worst.r) worst = { r, theme, t, s, fg, bg };
      if (r < MIN) {
        problems.push(`${theme}: ${t} (${fg}) on ${s} (${bg}) is ${r.toFixed(2)}:1, needs ${MIN}:1`);
      }
    }
  }
}

if (problems.length) {
  console.error("@ujg/brand — contrast contract violated:\n");
  for (const p of problems) console.error("  ✗ " + p);
  console.error("\nFix the token, do not lower the threshold.");
  process.exit(1);
}

console.log(
  `@ujg/brand — contrast contract holds. ${checks} token pairs checked across both themes, ` +
    `all ≥ ${MIN}:1 (tightest ${worst.r.toFixed(2)}:1 — ${worst.theme} ${worst.t} on ${worst.s}).`
);
