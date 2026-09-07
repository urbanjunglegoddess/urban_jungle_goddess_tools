/**
 * WCAG 2.1 AA audit of the built home page, in both themes, with axe-core.
 *
 * Not part of `pnpm check` — it needs a Chromium binary. Run it whenever a
 * colour token or a text size changes:
 *
 *   pnpm build && pnpm a11y
 *
 * Contrast failures are grouped by colour pair rather than by node, because
 * one bad token shows up as two thousand "violations" across 228 cards and
 * that number tells you nothing about what to fix.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(4322, r));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const axeSrc = readFileSync(AXE, "utf8");
let total = 0;

for (const [label, url, theme] of [
  ["home (dark)", "http://localhost:4322/", "dark"],
  ["home (light)", "http://localhost:4322/", "light"],
]) {
  const page = await browser.newPage();
  // The sandbox blocks Google Fonts, and the hanging request stops
  // networkidle from ever settling. Abort anything off-origin.
  await page.route("**/*", (route) =>
    route.request().url().startsWith("http://localhost:4322") ? route.continue() : route.abort()
  );
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
  await page.addScriptTag({ content: axeSrc });
  const r = await page.evaluate(async () =>
    await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] })
  );
  const v = r.violations;
  total += v.length;
  console.log(`${v.length === 0 ? "✓" : "✗"} ${label}: ${v.length} violation type(s), ${r.passes.length} checks passed`);
  for (const x of v) {
    if (x.id === "color-contrast") {
      // Group by the colour pair, not the node — 2000 nodes are a handful of
      // token pairs repeated across 228 cards.
      const pairs = new Map();
      for (const n of x.nodes) {
        const d = n.any.find((a) => a.id === "color-contrast")?.data;
        if (!d) continue;
        const key = `${d.fgColor} on ${d.bgColor} @${d.fontSize}/${d.fontWeight}`;
        const e = pairs.get(key) ?? { n: 0, ratio: d.contrastRatio, need: d.expectedContrastRatio, sample: n.html.slice(0, 70) };
        e.n++;
        pairs.set(key, e);
      }
      console.log(`    ${x.impact}: color-contrast — ${x.nodes.length} nodes, ${pairs.size} distinct colour pair(s):`);
      for (const [k, e] of [...pairs].sort((a, b) => b[1].n - a[1].n)) {
        console.log(`      ${e.ratio}:1 (needs ${e.need}) · ${k} · ×${e.n}`);
        console.log(`        ${e.sample}`);
      }
    } else {
      console.log(`    ${x.impact}: ${x.id} — ${x.help} (${x.nodes.length} node(s))\n      e.g. ${x.nodes[0].html.slice(0,110)}`);
    }
  }
  await page.close();
}

await browser.close();
server.close();
console.log(total === 0 ? "\n✓ zero WCAG 2.1 AA violations in either theme" : `\n✗ ${total} violation(s)`);
process.exit(total ? 1 : 0);
