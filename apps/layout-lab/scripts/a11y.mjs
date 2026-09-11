/**
 * WCAG 2.1 AA audit of everything Layout Lab builds, with axe-core.
 *
 * Two things make this audit different from the other apps':
 *
 *  - The catalog chrome is dual-theme, so it is run twice, once per palette.
 *    The demos are each single-theme by design — a demo is a page in a fixed
 *    visual idiom, not a themeable product surface — so they run once.
 *
 *  - Every demo is audited. That is the point: a layout that cannot clear AA
 *    is not a layout this studio would put in front of a client, and the whole
 *    value of building the twenty-four is finding that out here rather than in
 *    a project. Wireframes on catalog pages are decorative markup carried from
 *    the reference sheets, and are excluded by selector, not by ignoring rules.
 *
 * Not part of `pnpm check` — it needs a Chromium binary:
 *
 *   pnpm build && pnpm a11y
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const PORT = 4324;
const BASE = `http://localhost:${PORT}`;

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const catalog = JSON.parse(readFileSync(join(here, "..", "src", "data", "catalog.json"), "utf8"));
const demos = readdirSync(join(here, "..", "src", "pages", "demo"))
  .filter((f) => f.endsWith(".astro"))
  .map((f) => f.replace(/\.astro$/, ""));

/* The chrome, in both palettes, plus one layout page of each kind and one
   section page — they are generated from the same two templates, so auditing
   every one of the 103 would be 103 copies of the same result. */
const CHROME = [
  ["index", "/"],
  ["sections", "/sections"],
  ["layout (with demo)", "/layout/broken"],
  ["layout (wireframe only)", "/layout/webgl3d"],
  ["section detail", "/section/nav"],
];

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const axeSrc = readFileSync(AXE, "utf8");
let total = 0;
const failed = [];

/**
 * Wireframes are markup carried verbatim from the reference sheets: hundreds of
 * empty greys-on-greys divs that mean nothing to anyone. They are decorative,
 * and excluding them by selector is honest; turning off the contrast rule for
 * the whole page would not be.
 */
const EXCLUDE = [[".wf"], [".wfwrap"], [".var-wf"]];

async function audit(label, path, theme) {
  const page = await browser.newPage();
  // The sandbox blocks Google Fonts; a hanging request would stall the load.
  await page.route("**/*", (route) =>
    route.request().url().startsWith(BASE) ? route.continue() : route.abort()
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  if (theme) await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.waitForTimeout(450); // islands settle: palette list, console banner, canvas paint
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async (exclude) =>
    await window.axe.run(
      { include: [["body"]], exclude },
      { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }
    ), EXCLUDE);

  const v = r.violations;
  total += v.length;
  const name = label + (theme ? ` [${theme}]` : "");
  if (v.length || errors.length) failed.push(name);
  console.log(`${v.length === 0 ? "✓" : "✗"} ${name}: ${v.length} violation type(s), ${r.passes.length} checks passed`);
  for (const e of errors) console.log(`    ! script error: ${e.slice(0, 140)}`);

  for (const x of v) {
    if (x.id === "color-contrast") {
      // Grouped by colour pair, not by node: one bad value shows up as dozens
      // of nodes and that count says nothing about what to change.
      const pairs = new Map();
      for (const n of x.nodes) {
        const d = n.any.find((a) => a.id === "color-contrast")?.data;
        if (!d) continue;
        const key = `${d.fgColor} on ${d.bgColor} @${d.fontSize}/${d.fontWeight}`;
        const e = pairs.get(key) ?? { n: 0, ratio: d.contrastRatio, need: d.expectedContrastRatio, sample: n.html.slice(0, 80) };
        e.n++;
        pairs.set(key, e);
      }
      console.log(`    ${x.impact}: color-contrast — ${x.nodes.length} node(s), ${pairs.size} colour pair(s):`);
      for (const [k, e] of [...pairs].sort((a, b) => b[1].n - a[1].n)) {
        console.log(`      ${e.ratio}:1 (needs ${e.need}) · ${k} · ×${e.n}`);
        console.log(`        ${e.sample}`);
      }
    } else {
      console.log(`    ${x.impact}: ${x.id} — ${x.help} (${x.nodes.length} node(s))`);
      console.log(`      e.g. ${x.nodes[0].html.slice(0, 120)}`);
    }
  }
  await page.close();
}

console.log("— catalog chrome, both palettes —");
for (const [label, path] of CHROME) {
  await audit(label, path, "dark");
  await audit(label, path, "light");
}

console.log(`\n— ${demos.length} demo pages —`);
for (const slug of demos) {
  const name = catalog.layouts.find((l) => l.slug === slug)?.name ?? slug;
  await audit(`${slug} · ${name}`, `/demo/${slug}`, null);
}

await browser.close();
server.close();

const pages = CHROME.length * 2 + demos.length;
console.log(
  total === 0
    ? `\n✓ zero WCAG 2.1 AA violations across ${pages} page views`
    : `\n✗ ${total} violation type(s) across ${failed.length} page view(s): ${failed.join(", ")}`
);
process.exit(total ? 1 : 0);
