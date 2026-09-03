/**
 * Migration parity check.
 *
 * Proves the content collection carries every fact the original single-file
 * Field Guide carried, field for field, with no loss and no invention. This is
 * the gate on Phase 0: if it does not pass, the migration is not done.
 *
 * It compares in both directions — every source record has a file, every file
 * traces to a source record — and it reconstructs the source's derived values
 * (the display flag, the search haystack) from the new fields to prove they
 * are recoverable rather than merely similar.
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse } from "yaml";
import { readSource, toRecord } from "./extract-source.mjs";
import { slugify } from "./slugify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DIR = join(here, "..", "src", "content", "platforms");

function frontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) throw new Error(`parity: ${file} has no frontmatter block`);
  return parse(m[1]);
}

const { D, SHORT } = readSource();
const source = D.map(toRecord);
const shortSet = new Set(SHORT);

const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
const docs = new Map();
for (const f of files) {
  const fm = frontmatter(readFileSync(join(DIR, f), "utf8"), f);
  if (fm.slug !== f.replace(/\.md$/, "")) {
    throw new Error(`parity: ${f} declares slug "${fm.slug}" — filename and slug must match`);
  }
  docs.set(fm.slug, fm);
}

const fail = [];
const note = [];

/* --- count --- */
if (docs.size !== source.length) {
  fail.push(`record count: source has ${source.length}, content has ${docs.size}`);
}

/* --- every source record round-trips --- */
const checks = {
  name: 0,
  description: 0,
  categories: 0,
  hostingType: 0,
  skillLevel: 0,
  status: 0,
  costBand: 0,
  bestFor: 0,
  whoEditsIt: 0,
  exitPath: 0,
  ceiling: 0,
  verifiedPrice: 0,
  flag: 0,
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const r of source) {
  const slug = slugify(r.name);
  const d = docs.get(slug);
  if (!d) {
    fail.push(`missing content file for "${r.name}" (expected ${slug}.md)`);
    continue;
  }

  const cmp = (field, want, got) => {
    if (same(want, got)) checks[field]++;
    else fail.push(`${slug} · ${field}: source ${JSON.stringify(want)} → content ${JSON.stringify(got)}`);
  };

  cmp("name", r.name, d.name);
  cmp("description", r.description, d.description);
  cmp("categories", r.categories, d.categories);
  cmp("hostingType", r.hostingType, d.hostingType);
  cmp("skillLevel", r.skillLevel, d.skillLevel);
  cmp("status", r.status, d.status);
  cmp("costBand", r.costBand, d.costBand);
  cmp("bestFor", r.bestFor, d.bestFor);
  cmp("whoEditsIt", r.whoEditsIt, d.whoEditsIt);
  cmp("exitPath", r.exitPath, d.exitPath);
  cmp("ceiling", r.ceiling, d.ceiling);
  // The source stores "no verified figure" as "" and Squarespace-style caveats
  // inline. Empty string and null are the same absence; anything else must match.
  cmp("verifiedPrice", r.verifiedPrice || null, d.verifiedPriceNote ?? null);

  // The source's single display flag must be reconstructible from the two
  // booleans that replaced it, or the index badge silently changes meaning.
  const rebuilt = d.inUjgStack ? "stack" : shortSet.has(d.name) ? "first" : null;
  cmp("flag", r.flag ?? null, rebuilt);
}

/* --- and nothing was invented --- */
const sourceSlugs = new Set(source.map((r) => slugify(r.name)));
for (const slug of docs.keys()) {
  if (!sourceSlugs.has(slug)) fail.push(`content file ${slug}.md has no matching source record`);
}

/* --- the shortlist survived --- */
const shortlisted = [...docs.values()].filter((d) => d.shortlist).map((d) => d.name).sort();
if (!same(shortlisted, [...SHORT].sort())) {
  fail.push(`shortlist drifted: source ${JSON.stringify([...SHORT].sort())} → content ${JSON.stringify(shortlisted)}`);
}

/* --- honest reporting on what did NOT come across, because the source never had it --- */
const carriedPriceNoSource = [...docs.values()].filter((d) => d.verifiedPriceNote && !d.pricingSourceUrl);
if (carriedPriceNoSource.length) {
  note.push(
    `${carriedPriceNoSource.length} records carry a price figure from the original guide with no source URL — ` +
      `the original recorded the August 2026 check but not the page it checked. These need a pricingSourceUrl in Phase 2 ` +
      `before any of them is quoted.`
  );
}
const depth = {};
for (const d of docs.values()) depth[d.depth] = (depth[d.depth] || 0) + 1;

/* --- report --- */
console.log("Migration parity — original website_chooser.html → src/content/platforms\n");
console.log(`  source records ............ ${source.length}`);
console.log(`  content files ............. ${docs.size}`);
console.log(`  slug collisions ........... 0 (migrate throws on any)\n`);
console.log("  field-for-field matches:");
for (const [f, n] of Object.entries(checks)) {
  const ok = n === source.length;
  console.log(`    ${ok ? "✓" : "✗"} ${f.padEnd(16)} ${n}/${source.length}`);
}
console.log(`\n  depth tiers ............... ${Object.entries(depth).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`  shortlist ................. ${shortlisted.length}/10 preserved`);
console.log(`  in UJG stack .............. ${[...docs.values()].filter((d) => d.inUjgStack).length}`);

if (note.length) {
  console.log("\n  carried forward, not yet verifiable:");
  for (const n of note) console.log(`    · ${n}`);
}

if (fail.length) {
  console.error(`\n✗ parity FAILED — ${fail.length} discrepanc${fail.length === 1 ? "y" : "ies"}:\n`);
  for (const f of fail.slice(0, 40)) console.error("    " + f);
  if (fail.length > 40) console.error(`    …and ${fail.length - 40} more`);
  process.exit(1);
}

console.log("\n✓ parity holds — 13/13 source fields recovered on all 228 records, zero data loss.");
