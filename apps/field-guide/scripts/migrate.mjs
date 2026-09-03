/**
 * Migrate the original Field Guide's 228 records into content files.
 *
 * Lossless by construction: every one of the 13 source fields lands in a named
 * frontmatter field, and nothing is invented on the way. Fields the new schema
 * adds but the source never carried are written as `null` or `[]` — the honest
 * state — for Phase 2 to fill with sourced values.
 *
 * Re-runnable. Existing files are left alone unless --force is passed, so
 * hand-written Phase 2 depth is never clobbered by a re-migration.
 */
import { writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readSource, toRecord } from "./extract-source.mjs";
import { slugify } from "./slugify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "content", "platforms");
const DATA = join(here, "..", "src", "data");

const force = process.argv.includes("--force");
const clean = process.argv.includes("--clean");

/** The date the original guide states its status and pricing were checked. */
const SOURCE_CHECKED_ON = "2026-08-01";
/** The day this migration ran — what `lastReviewed` honestly means today. */
const MIGRATED_ON = new Date().toISOString().slice(0, 10);

/** YAML scalar. Always quoted, so a colon or a hash in prose cannot break the file. */
function y(v) {
  if (v === null || v === undefined || v === "") return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function list(arr) {
  if (!arr || arr.length === 0) return "[]";
  return "\n" + arr.map((v) => `  - ${y(v)}`).join("\n");
}

const { D, CAT, BAND, CMP, SHORT } = readSource();
const rows = D.map(toRecord);
const shortSet = new Set(SHORT);

if (clean && existsSync(OUT)) {
  for (const f of readdirSync(OUT)) if (f.endsWith(".md")) rmSync(join(OUT, f));
}
mkdirSync(OUT, { recursive: true });
mkdirSync(DATA, { recursive: true });

const seen = new Map();
let written = 0;
let skipped = 0;

for (const r of rows) {
  const slug = slugify(r.name);
  if (seen.has(slug)) {
    throw new Error(`migrate: slug collision "${slug}" — ${seen.get(slug)} and ${r.name}`);
  }
  seen.set(slug, r.name);

  const file = join(OUT, `${slug}.md`);
  if (existsSync(file) && !force) {
    skipped++;
    continue;
  }

  // Retired and legacy platforms are kept so a dead reference is recognised in
  // a call, not because anyone will build on them. They are stubs by default.
  const depth = r.status === "retired" || r.status === "absorbed" ? "stub" : "standard";

  // The source's own confidence: it names Aug 2026 as the check date, and the
  // 37 records carrying a real figure were checked against a vendor page. The
  // rest carry a band only, which is a planning estimate.
  const confidence = r.verifiedPrice ? "medium" : "low";

  const fm = [
    "---",
    `slug: ${y(slug)}`,
    `name: ${y(r.name)}`,
    `description: ${y(r.description)}`,
    "",
    "# --- identity ---",
    "officialUrl: null",
    "owner: null",
    `categories:${list(r.categories)}`,
    `hostingType: ${y(r.hostingType)}`,
    `skillLevel: ${y(r.skillLevel)}`,
    "",
    "# --- status ---",
    `status: ${y(r.status)}`,
    "statusEvidence: null",
    "statusSourceUrl: null",
    `statusCheckedOn: ${y(SOURCE_CHECKED_ON)}`,
    "",
    "# --- money ---",
    `costBand: ${y(r.costBand)}`,
    "plans: []",
    "fees: []",
    "pricingSourceUrl: null",
    r.verifiedPrice ? `pricingCheckedOn: ${y(SOURCE_CHECKED_ON)}` : "pricingCheckedOn: null",
    r.verifiedPrice ? `pricingConfidence: ${y("medium")}` : "pricingConfidence: null",
    `verifiedPriceNote: ${y(r.verifiedPrice || null)}`,
    "",
    "# --- the decision fields ---",
    `bestFor: ${y(r.bestFor)}`,
    "notFor: null",
    `whoEditsIt: ${y(r.whoEditsIt)}`,
    `exitPath: ${y(r.exitPath)}`,
    "exportDetail: null",
    `ceiling: ${y(r.ceiling)}`,
    "outgrowSignals: []",
    "",
    "# --- depth for the work ---",
    "strengths: []",
    "limits: []",
    "keyIntegrations: []",
    "seoNotes: null",
    "performanceNotes: null",
    "accessibilityNotes: null",
    "migrationIn: null",
    "migrationOut: null",
    "alternatives: []",
    "",
    "# --- internal, not client-facing ---",
    "buildNotes: null",
    `inUjgStack: ${r.flag === "stack"}`,
    `shortlist: ${shortSet.has(r.name)}`,
    "redFlags: []",
    "",
    "# --- client-safe ---",
    "proposalLine: null",
    "",
    "# --- housekeeping ---",
    `depth: ${y(depth)}`,
    `lastReviewed: ${y(MIGRATED_ON)}`,
    `confidence: ${y(confidence)}`,
    "---",
    "",
  ].join("\n");

  writeFileSync(file, fm, "utf8");
  written++;
}

/**
 * The decision-layer data that is not a platform record. Preserved verbatim so
 * Phase 3 builds Compare and Decide on the original values rather than
 * re-deriving them. Two CMP rows ("WordPress + Bricks", "Next.js on Vercel")
 * are deliberate composites and have no platform record of their own.
 */
writeFileSync(
  join(DATA, "source-decision-layer.json"),
  JSON.stringify(
    {
      note: "Verbatim from the original website_chooser.html. Do not edit by hand; re-run migrate.",
      categories: CAT,
      costBands: BAND,
      shortlist: SHORT,
      finalistComparison: {
        columns: [
          "Platform",
          "Platform cost",
          "Who edits after launch",
          "Exit path",
          "Commerce",
          "Your build effort",
          "They outgrow it when…",
        ],
        rows: CMP,
      },
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  `migrate: ${rows.length} source records → ${written} written, ${skipped} left alone` +
    `${force ? " (--force)" : " (pass --force to overwrite)"}`
);
console.log(`migrate: decision-layer data → src/data/source-decision-layer.json`);
