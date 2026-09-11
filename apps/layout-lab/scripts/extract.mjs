/**
 * Build the catalog from the frozen reference sheets.
 *
 * Same discipline as the Field Guide migration: the source is parsed, never
 * retyped. Every name, blurb, risk rating and "rare because / reach for it /
 * watch out" line comes straight out of the HTML, and each wireframe is
 * carried across as its original markup so the drawing on the page is
 * literally the drawing from the reference sheet.
 *
 * The third upload (the 24-layout sheet) was a strict subset of the 74-layout
 * one — every id in it appears in the larger file — so it is not kept.
 *
 *   pnpm run extract
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ref = (f) => readFileSync(join(here, "..", "reference", f), "utf8");

/** Decode the entity forms the source sheets emit. */
const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

const text = (html) => decode(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));

/**
 * Slice one balanced element out of `src` starting at `from`, given its tag.
 * Regex alone cannot do this — the wireframes nest divs dozens deep.
 */
function sliceElement(src, from, tag) {
  const open = new RegExp(`<${tag}(?=[\\s>])`, "g");
  const close = new RegExp(`</${tag}>`, "g");
  let depth = 0;
  let i = from;
  for (;;) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(src);
    const c = close.exec(src);
    if (!c) throw new Error(`extract: unclosed <${tag}> from ${from}`);
    if (o && o.index < c.index) {
      depth++;
      i = o.index + 1;
    } else {
      depth--;
      i = c.index + 1;
      if (depth === 0) return { html: src.slice(from, c.index + tag.length + 3), end: c.index + tag.length + 3 };
    }
  }
}

/* ---------------- avant-garde layouts ---------------- */

function extractLayouts() {
  const src = ref("avant-garde.source.html");
  const out = [];

  // Walk the document in order so each card picks up the round and category
  // heading it sits under.
  const marks = [...src.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>|<h3 class="cat"[^>]*>([\s\S]*?)<\/h3>|<article class="card" id="([^"]+)"/g)];
  let round = null;
  let category = null;

  for (const m of marks) {
    if (m[1] !== undefined) {
      round = text(m[1]);
      continue;
    }
    if (m[2] !== undefined) {
      category = text(m[2]).replace(/\s*\d+$/, ""); // the heading carries a count badge
      continue;
    }
    const slug = m[3];
    const { html: card } = sliceElement(src, m.index, "article");

    const wfAt = card.indexOf('<div class="wfwrap">');
    const wireframe = wfAt === -1 ? null : sliceElement(card, wfAt, "div").html;

    const name = text(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(card)?.[1] ?? "");
    const blurb = text(/<p class="tag">([\s\S]*?)<\/p>/.exec(card)?.[1] ?? "");
    const riskName = text(/<span class="rname">([\s\S]*?)<\/span>/.exec(card)?.[1] ?? "");
    const risk = (card.match(/<span class="rd on"><\/span>/g) ?? []).length;

    // The three dl rows, in the order the sheet writes them.
    const dd = [...card.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((x) => text(x[1]));

    out.push({
      slug,
      name,
      blurb,
      round,
      category,
      risk,
      riskName,
      rareBecause: dd[0] ?? null,
      reachFor: dd[1] ?? null,
      watchOut: dd[2] ?? null,
      wireframe,
    });
  }
  return out;
}

/* ---------------- section variants ---------------- */

function extractSections() {
  const src = ref("sections.source.html");
  const out = [];

  const marks = [...src.matchAll(/<div class="group-head">[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>|<section class="sec" id="([^"]+)"/g)];
  let group = null;

  for (const m of marks) {
    if (m[1] !== undefined) {
      group = text(m[1]);
      continue;
    }
    const slug = m[2];
    const { html: sec } = sliceElement(src, m.index, "section");

    const name = text(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(sec)?.[1] ?? "");
    const blurb = text(/<p class="sec-blurb">([\s\S]*?)<\/p>/.exec(sec)?.[1] ?? "");

    const variants = [];
    let at = 0;
    for (;;) {
      const i = sec.indexOf('<figure class="var">', at);
      if (i === -1) break;
      const { html: fig, end } = sliceElement(sec, i, "figure");
      at = end;

      const wfAt = fig.indexOf('<div class="var-wf">');
      const wireframe = wfAt === -1 ? null : sliceElement(fig, wfAt, "div").html;

      variants.push({
        name: text(/<h5[^>]*>([\s\S]*?)<\/h5>/.exec(fig)?.[1] ?? ""),
        blurb: text(/<figcaption>[\s\S]*?<p>([\s\S]*?)<\/p>/.exec(fig)?.[1] ?? ""),
        wireframe,
      });
    }

    out.push({ slug, name, blurb, group, variants });
  }
  return out;
}

const layouts = extractLayouts();
const sections = extractSections();

/* --- sanity: the counts the sheets advertise must be the counts we got --- */
const problems = [];
if (layouts.length !== 74) problems.push(`expected 74 layouts, extracted ${layouts.length}`);
if (sections.length !== 29) problems.push(`expected 29 sections, extracted ${sections.length}`);

for (const l of layouts) {
  if (!l.name || !l.blurb) problems.push(`${l.slug}: missing name or blurb`);
  if (!l.wireframe) problems.push(`${l.slug}: no wireframe carried across`);
  if (!l.round || !l.category) problems.push(`${l.slug}: no round/category`);
  if (l.risk < 1 || l.risk > 5) problems.push(`${l.slug}: risk ${l.risk} out of range`);
  if (!l.rareBecause || !l.reachFor || !l.watchOut) problems.push(`${l.slug}: missing a dl row`);
}
for (const s of sections) {
  if (!s.name || !s.variants.length) problems.push(`${s.slug}: missing name or variants`);
  for (const v of s.variants) {
    if (!v.name) problems.push(`${s.slug}: a variant has no name`);
    if (!v.wireframe) problems.push(`${s.slug} / ${v.name}: no wireframe`);
  }
}

// The section sheet prints "N variations" on each heading — check we got N.
const advertised = [...ref("sections.source.html").matchAll(/<span class="count">(\d+) variations?<\/span>/g)].map((m) => Number(m[1]));
sections.forEach((s, i) => {
  if (advertised[i] !== undefined && advertised[i] !== s.variants.length) {
    problems.push(`${s.slug}: sheet says ${advertised[i]} variations, extracted ${s.variants.length}`);
  }
});

if (problems.length) {
  console.error("extract: the reference sheets did not parse cleanly:\n");
  for (const p of problems.slice(0, 30)) console.error("  ✗ " + p);
  process.exit(1);
}

const variantCount = sections.reduce((n, s) => n + s.variants.length, 0);
mkdirSync(join(here, "..", "src", "data"), { recursive: true });
writeFileSync(
  join(here, "..", "src", "data", "catalog.json"),
  JSON.stringify(
    {
      note: "GENERATED from reference/*.source.html by scripts/extract.mjs. Do not edit by hand.",
      layouts,
      sections,
    },
    null,
    2
  ) + "\n"
);

console.log(
  `extract: ${layouts.length} avant-garde layouts across ${new Set(layouts.map((l) => l.round)).size} rounds ` +
    `and ${new Set(layouts.map((l) => l.category)).size} categories; ` +
    `${sections.length} sections carrying ${variantCount} variants. Every wireframe carried across.`
);
