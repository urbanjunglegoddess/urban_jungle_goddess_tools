/**
 * The catalog contract.
 *
 * Two jobs, both of them things that would otherwise rot silently:
 *
 *  1. Parity. catalog.json is generated from the frozen reference sheets, so
 *     the sheets are re-read here with independent selectors — deliberately not
 *     by importing extract.mjs, which writes catalog.json as a side effect and
 *     would therefore be marking its own homework — and every id, name, risk
 *     rating and variant count is compared both directions.
 *
 *  2. Demo hygiene. A demo is only worth the name if it is a real, isolated
 *     page built from the shared copy. Each one is read and checked for that.
 *
 *   pnpm --filter @ujg/layout-lab test
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const read = (...p) => readFileSync(join(app, ...p), "utf8");

const problems = [];
let checks = 0;
const ok = (label, cond) => {
  checks++;
  if (!cond) problems.push(label);
};
const same = (label, got, want) => {
  checks++;
  if (got !== want) problems.push(`${label}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
};

const catalog = JSON.parse(read("src", "data", "catalog.json"));
const { layouts, sections } = catalog;

/* ---------------- 1. parity with the frozen sheets ---------------- */

const strip = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const avant = read("reference", "avant-garde.source.html");
const secsrc = read("reference", "sections.source.html");

// Every card in the sheet, by id, with the name and risk word beside it.
const sheetLayouts = new Map();
for (const m of avant.matchAll(/<article class="card" id="([^"]+)"([\s\S]*?)<\/article>/g)) {
  sheetLayouts.set(m[1], {
    name: strip(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])?.[1] ?? ""),
    riskName: strip(/<span class="rname">([\s\S]*?)<\/span>/.exec(m[2])?.[1] ?? ""),
    risk: (m[2].match(/<span class="rd on"><\/span>/g) ?? []).length,
  });
}

same("layout count matches the sheet", layouts.length, sheetLayouts.size);

for (const l of layouts) {
  const s = sheetLayouts.get(l.slug);
  if (!s) {
    problems.push(`${l.slug}: in catalog.json but not in the sheet`);
    checks++;
    continue;
  }
  same(`${l.slug}: name`, l.name, s.name);
  same(`${l.slug}: risk word`, l.riskName, s.riskName);
  same(`${l.slug}: risk rating`, l.risk, s.risk);
  ok(`${l.slug}: carries its wireframe`, typeof l.wireframe === "string" && l.wireframe.length > 40);
  ok(`${l.slug}: has a round`, Boolean(l.round));
  ok(`${l.slug}: has a category`, Boolean(l.category));
}
for (const id of sheetLayouts.keys()) {
  ok(`${id}: in the sheet but missing from catalog.json`, layouts.some((l) => l.slug === id));
}

// Sections: the sheet prints its own variant count on every heading. Use it.
const advertised = [...secsrc.matchAll(/<span class="count">(\d+) variations?<\/span>/g)].map((m) => Number(m[1]));
const sheetSectionIds = [...secsrc.matchAll(/<section class="sec" id="([^"]+)"/g)].map((m) => m[1]);

same("section count matches the sheet", sections.length, sheetSectionIds.length);
same("section order matches the sheet", sections.map((s) => s.slug).join(","), sheetSectionIds.join(","));

sections.forEach((s, i) => {
  same(`${s.slug}: variant count against the sheet's own badge`, s.variants.length, advertised[i]);
  for (const v of s.variants) {
    ok(`${s.slug} / ${v.name}: carries its wireframe`, typeof v.wireframe === "string" && v.wireframe.length > 40);
  }
});

// Slugs are URL segments, so they must be unique and safe.
const dupes = layouts.map((l) => l.slug).filter((s, i, a) => a.indexOf(s) !== i);
same("layout slugs are unique", dupes.join(","), "");
for (const l of layouts) ok(`${l.slug}: slug is url-safe`, /^[a-z0-9-]+$/.test(l.slug));
for (const s of sections) ok(`${s.slug}: slug is url-safe`, /^[a-z0-9-]+$/.test(s.slug));

/* ---------------- 2. demo hygiene ---------------- */

const demoDir = join(app, "src", "pages", "demo");
const demos = existsSync(demoDir)
  ? readdirSync(demoDir).filter((f) => f.endsWith(".astro")).map((f) => f.replace(/\.astro$/, ""))
  : [];

ok("there is at least one demo", demos.length > 0);

for (const slug of demos) {
  const src = read("src", "pages", "demo", `${slug}.astro`);

  // A demo page named for a layout that does not exist would build a route
  // nothing links to, and quietly inflate the "built" count on the index.
  ok(`demo ${slug}: names a real layout`, layouts.some((l) => l.slug === slug));

  // Isolation is the whole reason demos are separate documents.
  ok(`demo ${slug}: uses DemoBase`, /import DemoBase from ".*layouts\/DemoBase.astro"/.test(src));
  ok(`demo ${slug}: does not import the catalog stylesheet`, !src.includes("styles/site.css"));
  ok(`demo ${slug}: declares its own slug to DemoBase`, src.includes(`slug="${slug}"`));

  // Shared copy is what makes the demos comparable to each other.
  ok(`demo ${slug}: renders the shared copy`, src.includes('from "../../lib/demoContent"'));

  // Demo styling must be global-by-document, never leaning on the chrome.
  ok(`demo ${slug}: styles itself`, src.includes("<style is:global>"));
}

/* Coverage, reported rather than asserted: the lab is honest about being
   partly built, so this is a fact printed for the reader, not a failure. */
const byRound = new Map();
for (const l of layouts) {
  const r = byRound.get(l.round) ?? { total: 0, built: 0 };
  r.total++;
  if (demos.includes(l.slug)) r.built++;
  byRound.set(l.round, r);
}

/* ---------------- report ---------------- */

if (problems.length) {
  console.error(`catalog-check: ${problems.length} problem(s) of ${checks} checks:\n`);
  for (const p of problems.slice(0, 40)) console.error("  ✗ " + p);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}

const variants = sections.reduce((n, s) => n + s.variants.length, 0);
console.log(
  `catalog-check: ${checks} checks passed. ` +
    `${layouts.length} layouts and ${sections.length} sections (${variants} variants) match the frozen sheets exactly.`
);
for (const [round, r] of byRound) {
  console.log(`  ${r.built}/${r.total} built — ${round}`);
}
