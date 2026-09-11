/**
 * Walk the assembled site the way a person does.
 *
 * links-check proves every href resolves to a file. That is necessary and not
 * sufficient: a page can load with every link intact and still be broken if its
 * stylesheet 404s, which is exactly the failure mode a base-path change
 * introduces. Astro rewrites asset URLs from `base`, so a wrong base gives you
 * a site of unstyled pages with perfectly valid links.
 *
 * So this opens a real browser on a server that behaves like Vercel with
 * cleanUrls, clicks from the home page into each tool, uses it, and checks the
 * styling actually arrived.
 *
 *   pnpm build && pnpm site-smoke
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(root, "dist");
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".pf_meta": "application/octet-stream", ".pf_fragment": "application/octet-stream",
};
const PORT = 4330;
const BASE = `http://localhost:${PORT}`;

/** cleanUrls: true, trailingSlash: false — the same mapping vercel.json sets. */
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (existsSync(f) && !extname(f)) f = join(f, "index.html");
  if (!existsSync(f)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const problems = [];
let checks = 0;
const ok = (label, cond) => {
  checks++;
  if (!cond) problems.push(label);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* Every request that leaves this origin is blocked (the sandbox has no egress
   and a hanging font request would stall the load). Anything on this origin
   that 404s is a real failure and is recorded. */
const missing = [];
await page.route("**/*", (route) => {
  const url = route.request().url();
  return url.startsWith(BASE) ? route.continue() : route.abort();
});
page.on("response", (r) => {
  if (r.url().startsWith(BASE) && r.status() >= 400) missing.push(`${r.status()} ${r.url().slice(BASE.length)}`);
});

/**
 * Did this page's own stylesheet load AND apply?
 *
 * Two traps here, both hit on the way to getting this right. "domcontentloaded"
 * fires before stylesheets do, so the check has to wait for "load" or it races
 * the page and fails at random. And backgroundColor is the wrong signal: Focus
 * paints its ground with a gradient, which is a background-image, leaving
 * backgroundColor transparent on a perfectly styled page. The brand type stack
 * is the honest probe — if it is on <body>, the app's CSS arrived and applied.
 */
async function styled() {
  await page.waitForLoadState("load");
  return await page.evaluate(() => {
    if (document.styleSheets.length === 0) return false;
    return /Urbanist|Chakra Petch|JetBrains Mono/.test(getComputedStyle(document.body).fontFamily);
  });
}

/* ---------------- the front door ---------------- */
await page.goto(BASE + "/", { waitUntil: "load" });
ok("home: loads", (await page.title()).includes("Urban Jungle Goddess"));
ok("home: is styled", await styled());

const opens = page.locator("a.open");
ok("home: an Open link for each served tool", (await opens.count()) === 3);

const targets = await opens.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
ok("home: links to the Field Guide", targets.includes("/field-guide"));
ok("home: links to Focus", targets.includes("/focus"));
ok("home: links to Layout Lab", targets.includes("/layout-lab"));

/* ---------------- the Field Guide ---------------- */
await page.goto(BASE + "/", { waitUntil: "load" });
await page.locator('a.open[href="/field-guide"]').click();
await page.waitForLoadState("load");
ok("field-guide: reached from the home page", page.url().endsWith("/field-guide"));
ok("field-guide: is styled", await styled());
const cards = page.locator(".card a").first();
const platform = await cards.getAttribute("href");
ok("field-guide: platform links carry the prefix", Boolean(platform?.startsWith("/field-guide/")));
await cards.click();
await page.waitForLoadState("load");
ok("field-guide: a platform page opens", page.url().startsWith(BASE + "/field-guide/"));
ok("field-guide: the platform page is styled", await styled());
await page.locator(".crumb a").first().click();
await page.waitForLoadState("load");
ok("field-guide: the crumb goes back to its own index", page.url().endsWith("/field-guide"));

// Pagefind is fetched at runtime from an absolute path, so the prefix matters.
await page.waitForTimeout(400);
const pagefindOk = await page.evaluate(async () => {
  try {
    const r = await fetch("/field-guide/pagefind/pagefind.js");
    return r.ok;
  } catch {
    return false;
  }
});
ok("field-guide: the search index is where the page looks for it", pagefindOk);

/* ---------------- Focus ---------------- */
await page.goto(BASE + "/", { waitUntil: "load" });
await page.locator('a.open[href="/focus"]').click();
await page.waitForLoadState("load");
ok("focus: reached from the home page", page.url().endsWith("/focus"));
ok("focus: is styled", await styled());
await page.locator(".ladder a").first().click();
await page.waitForLoadState("load");
ok("focus: a tool opens from the ladder", page.url().endsWith("/focus/fit"));
ok("focus: the tool is styled", await styled());
await page.waitForTimeout(500);
ok("focus: the island rendered the compare grid", (await page.locator("table, .cmp, .grid, .row").count()) > 0);
await page.locator('.toolnav a[href="/focus"]').click();
await page.waitForLoadState("load");
ok("focus: the nav returns to its own index", page.url().endsWith("/focus"));

/* ---------------- Layout Lab ---------------- */
await page.goto(BASE + "/", { waitUntil: "load" });
await page.locator('a.open[href="/layout-lab"]').click();
await page.waitForLoadState("load");
ok("layout-lab: reached from the home page", page.url().endsWith("/layout-lab"));
ok("layout-lab: is styled", await styled());
await page.locator("a.card").first().click();
await page.waitForLoadState("load");
ok("layout-lab: a layout page opens", page.url().includes("/layout-lab/layout/"));
ok("layout-lab: the layout page is styled", await styled());

// The demo is an iframe, so its own prefix has to be right or the frame is blank.
const frameSrc = await page.locator(".demo-frame iframe").first().getAttribute("src");
ok("layout-lab: the demo iframe carries the prefix", Boolean(frameSrc?.startsWith("/layout-lab/demo/")));
await page.waitForTimeout(600);
const frame = page.frames().find((f) => f.url().includes("/layout-lab/demo/"));
ok("layout-lab: the demo actually loads in the frame", Boolean(frame));
if (frame) {
  ok("layout-lab: the demo is styled inside the frame",
     await frame.evaluate(() => getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)"));
  ok("layout-lab: the demo keeps its way back",
     (await frame.locator(".lab-chip").count()) === 1);
}
await page.goto(BASE + "/layout-lab/sections", { waitUntil: "load" });
ok("layout-lab: the section playbook opens", (await page.locator(".seclist a").count()) > 20);
await page.locator(".seclist a").first().click();
await page.waitForLoadState("load");
ok("layout-lab: a section page opens", page.url().includes("/layout-lab/section/"));

/* ---------------- nothing 404'd along the way ---------------- */
ok(`no failed requests (${missing.slice(0, 4).join(", ")})`, missing.length === 0);

await page.close();
await browser.close();
server.close();

if (problems.length) {
  console.error(`site-smoke: ${problems.length} failure(s) of ${checks} checks:\n`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log(`site-smoke: ${checks}/${checks} — the front door opens all three tools, and every tool works from it.`);
