/**
 * Lift the original Field Guide's stylesheet into the app.
 *
 * The brief is explicit that the visual system is carried across exactly, not
 * reinterpreted — so the CSS is extracted from the frozen source rather than
 * retyped, which is the only way to be certain nothing drifted.
 *
 * Two substitutions are made on the way through:
 *   1. The :root / light-theme palette blocks are dropped. They now live in
 *      @ujg/brand, which is the whole point of the package.
 *   2. Hardcoded font stacks become the brand's type tokens.
 *
 * Everything else is byte-for-byte the original. Site-specific additions go in
 * site.css after the import, not in here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SOURCE_PATH } from "./extract-source.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "styles", "carried.css");

const html = readFileSync(SOURCE_PATH, "utf8");
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error("extract-styles: no <style> block in the source");
let css = m[1];

/** Drop a top-level block by the text that opens it, braces balanced. */
function dropBlock(text, open) {
  const at = text.indexOf(open);
  if (at === -1) throw new Error(`extract-styles: block not found — ${open}`);
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(0, at) + text.slice(i + 1);
    }
  }
  throw new Error(`extract-styles: unbalanced braces after ${open}`);
}

// The palette moved to @ujg/brand. Dropping it here is what stops the two
// copies from drifting apart.
css = dropBlock(css, ":root {");
css = dropBlock(css, "@media (prefers-color-scheme: light)");
css = dropBlock(css, ':root[data-theme="light"]');

// Type comes from the brand tokens too.
const FONTS = [
  [/"Chakra Petch",\s*"Urbanist",\s*sans-serif/g, "var(--font-display)"],
  [/"Chakra Petch",\s*sans-serif/g, "var(--font-display)"],
  [/"Chakra Petch",\s*monospace/g, "var(--font-display)"],
  [/"JetBrains Mono",\s*ui-monospace,\s*monospace/g, "var(--font-mono)"],
  [/"JetBrains Mono",\s*monospace/g, "var(--font-mono)"],
  [
    /"Urbanist",\s*\n?\s*ui-sans-serif,\s*\n?\s*system-ui,\s*\n?\s*-apple-system,\s*\n?\s*"Segoe UI",\s*\n?\s*sans-serif/g,
    "var(--font-body)",
  ],
];
for (const [re, token] of FONTS) css = css.replace(re, token);

const leftover = css.match(/"(Chakra Petch|Urbanist|JetBrains Mono)"/g);
if (leftover) {
  throw new Error(
    `extract-styles: ${leftover.length} hardcoded font reference(s) survived — add a pattern: ${[...new Set(leftover)].join(", ")}`
  );
}

const header = `/*
 * Carried from the original website_chooser.html — GENERATED, do not edit.
 * Regenerate with: pnpm run styles
 *
 * The palette and type stacks were replaced with @ujg/brand tokens on the way
 * through; everything else is the original visual system unchanged.
 */
`;

writeFileSync(OUT, header + css.trim() + "\n", "utf8");
console.log(
  `extract-styles: ${(css.length / 1024).toFixed(1)}kB carried across, palette and type now from @ujg/brand`
);
