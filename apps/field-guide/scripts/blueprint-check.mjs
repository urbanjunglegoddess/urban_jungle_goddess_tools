/**
 * Blueprint-rule check, run against the built HTML.
 *
 * The rule: internal content — build notes, stack and shortlist flags, and the
 * comparison reasoning in `alternatives` — must live inside a [data-internal]
 * element, because that is what the handout view detaches. Anything internal
 * sitting outside one would survive the toggle and reach a client.
 *
 * This asserts the structure rather than trusting the template, so a future
 * edit that moves a field out of the internal block fails here instead of in
 * front of a client.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "dist");
const CONTENT = join(here, "..", "src", "content", "platforms");

if (!existsSync(DIST)) {
  console.error("blueprint: dist/ not found — run `pnpm build` first.");
  process.exit(1);
}

/** Remove every [data-internal] element, braces-balanced on tag nesting. */
function stripInternal(html) {
  let out = html;
  for (;;) {
    const at = out.search(/<(\w+)[^>]*\sdata-internal(?=[\s>])/);
    if (at === -1) return out;
    const tag = /^<(\w+)/.exec(out.slice(at))[1];
    // Walk forward counting opens and closes of this tag name.
    let i = at;
    let depth = 0;
    const open = new RegExp(`<${tag}(?=[\\s>])`, "g");
    const close = new RegExp(`</${tag}>`, "g");
    while (i < out.length) {
      open.lastIndex = i;
      close.lastIndex = i;
      const o = open.exec(out);
      const c = close.exec(out);
      if (!c) throw new Error(`blueprint: unclosed <${tag} data-internal>`);
      if (o && o.index < c.index) {
        depth++;
        i = o.index + 1;
      } else {
        depth--;
        i = c.index + 1;
        if (depth === 0) {
          out = out.slice(0, at) + out.slice(c.index + tag.length + 3);
          break;
        }
      }
    }
  }
}

/** Decode the entity forms Astro emits, so comparisons are on real text. */
function decode(html) {
  return html
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? parse(m[1]) : null;
}

const fail = [];
let checked = 0;
let withInternal = 0;

for (const file of readdirSync(CONTENT).filter((f) => f.endsWith(".md"))) {
  const d = frontmatter(readFileSync(join(CONTENT, file), "utf8"));
  const page = join(DIST, `${d.slug}.html`);
  if (!existsSync(page)) {
    fail.push(`${d.slug}: no page was built`);
    continue;
  }
  checked++;

  const html = readFileSync(page, "utf8");
  if (!html.includes("data-internal")) {
    fail.push(`${d.slug}: page has no [data-internal] element — the handout view would strip nothing`);
    continue;
  }
  withInternal++;

  const handout = stripInternal(html);

  /** Strings that must not survive the handout view. */
  const forbidden = [];
  if (d.buildNotes) forbidden.push(["buildNotes", d.buildNotes]);
  if (d.inUjgStack) forbidden.push(["stack flag", "Your stack"]);
  if (!d.inUjgStack && d.shortlist) forbidden.push(["shortlist flag", "Shortlist"]);
  for (const f of d.redFlags ?? []) forbidden.push(["redFlag", f]);
  for (const a of d.alternatives ?? []) forbidden.push(["comparison reasoning", a.insteadWhen]);

  // Astro escapes apostrophes and ampersands on the way out, so compare on the
  // decoded text rather than trying to guess the exact escaping.
  const plain = decode(handout);

  for (const [what, text] of forbidden) {
    if (plain.includes(String(text))) {
      fail.push(`${d.slug}: ${what} survives the handout view — it is outside [data-internal]`);
    }
  }

  /* --- and the client-safe fields must NOT have been swept into it --- */
  const mustSurvive = [
    ["bestFor", d.bestFor],
    ["ceiling", d.ceiling],
  ];
  if (d.proposalLine) mustSurvive.push(["proposalLine", d.proposalLine]);
  for (const [what, text] of mustSurvive) {
    if (!plain.includes(String(text))) {
      fail.push(`${d.slug}: ${what} is client-safe but does not survive the handout view`);
    }
  }
}

console.log(`Blueprint rule — ${checked} platform pages checked, ${withInternal} carry an internal block.`);

if (fail.length) {
  console.error(`\n✗ blueprint FAILED — ${fail.length} leak(s):\n`);
  for (const f of fail.slice(0, 30)) console.error("    " + f);
  if (fail.length > 30) console.error(`    …and ${fail.length - 30} more`);
  process.exit(1);
}

console.log("✓ no internal field survives the handout view; every client-safe field does.");
