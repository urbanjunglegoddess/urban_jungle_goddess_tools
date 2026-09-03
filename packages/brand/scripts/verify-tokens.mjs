/**
 * @ujg/brand token contract.
 *
 * Enforces the one rule that actually breaks themes: no colour may have its
 * only definition inside a media query or a [data-theme] block. Anything the
 * light palettes redefine must exist on bare :root first, and the two light
 * blocks must agree with each other or the toggle and the OS setting disagree.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "tokens.css"), "utf8");

/** Pull the declarations out of a block, given the text that opens it. */
function block(open) {
  const at = css.indexOf(open);
  if (at === -1) throw new Error(`verify-tokens: block not found — ${open}`);
  let depth = 0;
  let start = -1;
  for (let i = at; i < css.length; i++) {
    if (css[i] === "{") {
      depth++;
      if (depth === 1) start = i + 1;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i);
    }
  }
  throw new Error(`verify-tokens: unbalanced braces after ${open}`);
}

function vars(text) {
  const out = new Map();
  for (const m of text.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out.set(m[1], m[2].trim());
  }
  return out;
}

const base = vars(block(":root {"));
const media = vars(block("@media (prefers-color-scheme: light)"));
const explicit = vars(block(':root[data-theme="light"]'));

const problems = [];

for (const name of media.keys()) {
  if (!base.has(name)) {
    problems.push(`${name} is defined only inside the media query — it needs a definition on bare :root`);
  }
}
for (const name of explicit.keys()) {
  if (!base.has(name)) {
    problems.push(`${name} is defined only inside :root[data-theme="light"] — it needs a definition on bare :root`);
  }
}

// The two light palettes must be identical, or the toggle and the OS setting
// render different sites.
for (const [name, value] of media) {
  if (!explicit.has(name)) {
    problems.push(`${name} is in the media-query light palette but missing from :root[data-theme="light"] — the toggle will not reach it`);
  } else if (explicit.get(name) !== value) {
    problems.push(`${name} disagrees between the light palettes: media "${value}" vs toggle "${explicit.get(name)}"`);
  }
}
for (const name of explicit.keys()) {
  if (!media.has(name)) {
    problems.push(`${name} is in :root[data-theme="light"] but missing from the media-query light palette`);
  }
}

// The seven brand anchors must be present and exact.
const ANCHORS = {
  "--ujg-night": "#0a0a0a",
  "--ujg-dark-green": "#042d1d",
  "--ujg-eminence": "#5f2c82",
  "--ujg-spanish-orange": "#e86100",
  "--ujg-goldenrod": "#dca424",
  "--ujg-platinum": "#e8e6e1",
  "--ujg-sienna": "#7e3209",
};
for (const [name, hex] of Object.entries(ANCHORS)) {
  const got = base.get(name);
  if (!got) problems.push(`brand anchor ${name} is missing`);
  else if (got.toLowerCase() !== hex) problems.push(`brand anchor ${name} is ${got}, expected ${hex}`);
}

if (problems.length) {
  console.error("@ujg/brand — token contract violated:\n");
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}

console.log(
  `@ujg/brand — token contract holds. ${base.size} tokens on :root, ` +
    `${media.size} redefined in both light palettes, 7 brand anchors exact.`
);
