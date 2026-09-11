/**
 * What the build actually shipped.
 *
 * catalog-check reads the source; this reads dist/. The two things it proves
 * cannot be proved any other way:
 *
 *  1. Coverage — every catalogued layout and section has a page, and every
 *     demo route exists. A missing page is a 404 from a card that says "Demo".
 *
 *  2. Isolation — a demo document carries none of the catalog's chrome, and
 *     the catalog carries none of the demos' styling. They share one origin and
 *     one stylesheet pipeline, so the only thing keeping them apart is that
 *     they are separate documents. This asserts that they still are.
 *
 *   pnpm --filter @ujg/layout-lab isolation
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const dist = join(app, "dist");

if (!existsSync(dist)) {
  console.error("isolation-check: no dist/ — run the build first.");
  process.exit(1);
}

/* The prefix this app is served under, read out of its own Astro config so the
   two can never disagree. Every link the build emits carries it. */
const BASE = (/base:\s*"([^"]+)"/.exec(readFileSync(join(app, "astro.config.mjs"), "utf8"))?.[1] ?? "").replace(/\/$/, "");
const at = (p) => BASE + p;

const catalog = JSON.parse(readFileSync(join(app, "src", "data", "catalog.json"), "utf8"));
const problems = [];
let checks = 0;
const ok = (label, cond) => {
  checks++;
  if (!cond) problems.push(label);
};

const page = (...p) => {
  const f = join(dist, ...p);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
};

/* ---------------- 1. coverage ---------------- */

ok("the index page built", page("index.html") !== null);
ok("the section playbook built", page("sections.html") !== null);

for (const l of catalog.layouts) ok(`layout page /${l.slug} built`, page("layout", `${l.slug}.html`) !== null);
for (const s of catalog.sections) ok(`section page /${s.slug} built`, page("section", `${s.slug}.html`) !== null);

const demoSlugs = readdirSync(join(app, "src", "pages", "demo"))
  .filter((f) => f.endsWith(".astro"))
  .map((f) => f.replace(/\.astro$/, ""));

for (const slug of demoSlugs) ok(`demo page /demo/${slug} built`, page("demo", `${slug}.html`) !== null);

/* The index promises a demo for exactly the slugs that have one. A card
   marked "Demo" with no page behind it is the one lie this tool must not tell. */
const index = page("index.html") ?? "";
for (const l of catalog.layouts) {
  const linked = index.includes(`href="${at(`/layout/${l.slug}`)}"`);
  ok(`index links to ${at(`/layout/${l.slug}`)}`, linked);
}

for (const slug of demoSlugs) {
  const detail = page("layout", `${slug}.html`) ?? "";
  ok(`layout page ${slug} embeds its demo`, detail.includes(`src="${at(`/demo/${slug}`)}"`));
  ok(`layout page ${slug} offers the demo full screen`, detail.includes(`href="${at(`/demo/${slug}`)}"`));
}

for (const l of catalog.layouts) {
  if (demoSlugs.includes(l.slug)) continue;
  const detail = page("layout", `${l.slug}.html`) ?? "";
  ok(`layout page ${l.slug} says plainly that it is not built`, detail.includes("Not built yet"));
  ok(`layout page ${l.slug} does not embed a demo it does not have`, !detail.includes(`src="${at(`/demo/${l.slug}`)}"`));
}

/* ---------------- 2. isolation ---------------- */

/* Selectors and tokens only the catalog stylesheet defines. Generic names like
   .wrap are deliberately not on this list — several demos legitimately use one,
   and a shared class name across two documents is not a leak. These are the
   markers that can only arrive by a demo pulling in site.css or the brand
   tokens, which is the failure this is actually looking for. */
const CHROME = [".demo-frame", ".card-meta", ".seclist", ".rdots", ".warnbar", "--ujg-night"];

for (const slug of demoSlugs) {
  const html = page("demo", `${slug}.html`) ?? "";
  ok(`demo ${slug}: is a whole document`, /<html lang="en">/.test(html) && html.includes("</html>"));
  ok(`demo ${slug}: has a title`, /<title>[^<]+<\/title>/.test(html));
  ok(`demo ${slug}: keeps the way back`, html.includes('class="lab-chip"'));
  ok(`demo ${slug}: is not indexed`, html.includes('name="robots" content="noindex"'));
  for (const marker of CHROME) {
    ok(`demo ${slug}: carries no catalog chrome (${marker})`, !html.includes(marker));
  }
  /* Reduced motion is not optional in a lab full of motion layouts. It is in
     DemoBase, so this is really a check that DemoBase was not bypassed. */
  ok(`demo ${slug}: honours reduced motion`, html.includes("prefers-reduced-motion"));
}

/* And the other direction: the catalog pages must not inherit a demo's styling.
   Demo CSS is global within its own document, so the only safe state is that
   none of it is in the catalog's bundle at all. */
const chromePages = ["index.html", "sections.html", join("layout", "broken.html")];
for (const p of chromePages) {
  const html = page(...p.split(/[\\/]/)) ?? "";
  ok(`${p}: does not inline a demo's styling`, !html.includes(".lab-chip"));
}

/* ---------------- report ---------------- */

if (problems.length) {
  console.error(`isolation-check: ${problems.length} problem(s) of ${checks} checks:\n`);
  for (const p of problems.slice(0, 40)) console.error("  ✗ " + p);
  if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`);
  process.exit(1);
}

console.log(
  `isolation-check: ${checks} checks passed. ` +
    `${catalog.layouts.length} layout pages, ${catalog.sections.length} section pages, ` +
    `${demoSlugs.length} demo documents — all built, all sealed off from the chrome.`
);
