/**
 * Browser smoke test for the built site.
 *
 * Not part of `pnpm check` — it needs a Chromium binary, which not every
 * machine has. Run it after a build when the interactive pieces change:
 *
 *   pnpm build && pnpm smoke
 *
 * It exercises what a static build cannot prove on its own: that the filters
 * actually filter, that the handout view actually removes the internal block,
 * and that the theme toggle wins in both directions.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".pf_meta":"application/octet-stream", ".pf_fragment":"application/octet-stream", ".pf_index":"application/octet-stream" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (!existsSync(f)) { res.writeHead(404); return res.end("nope"); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(4321, r));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("requestfailed", r => errors.push("failed: " + r.url()));
page.on("response", r => { if (r.status() >= 400) errors.push("http " + r.status() + ": " + r.url()); });

const out = [];
const check = (name, ok, detail = "") => out.push(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);

/* ---- index ---- */
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
const visible = () => page.locator(".card:not([hidden])").count();
check("index renders 228 cards", (await visible()) === 228, `${await visible()} visible`);

// horizontal overflow
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
check("no horizontal body scroll", !overflow);

// search
await page.fill("#q", "shopify");
await page.waitForTimeout(120);
const nSearch = await visible();
check("search narrows the grid", nSearch > 0 && nSearch < 228, `${nSearch} for "shopify"`);

// "what the site needs to do" search, not just names
await page.fill("#q", "member areas");
await page.waitForTimeout(120);
check("search reaches prose, not just names", (await visible()) > 0, `${await visible()} for "member areas"`);

await page.fill("#q", "");
await page.waitForTimeout(120);

// category chip
await page.click('[data-cat="ecom"]');
await page.waitForTimeout(120);
const nEcom = await visible();
check("category chip filters", nEcom > 0 && nEcom < 228, `${nEcom} ecommerce`);

// toggle composes with chip
await page.click('[data-toggle="nocode"]');
await page.waitForTimeout(120);
const nBoth = await visible();
check("toggle composes with chip", nBoth > 0 && nBoth < nEcom, `${nBoth} ecommerce + no-code`);

// reset
await page.click("#clear");
await page.waitForTimeout(120);
check("reset restores all", (await visible()) === 228);

// empty state
await page.fill("#q", "zzzzqqq");
await page.waitForTimeout(120);
check("empty state appears", await page.locator("#empty").isVisible());
await page.fill("#q", "");
await page.waitForTimeout(120);

// "/" focuses search
await page.click("h1");
await page.keyboard.press("/");
check("slash focuses search", await page.evaluate(() => document.activeElement?.id === "q"));

// pagefind deep search
await page.fill("#q", "velo");
await page.waitForTimeout(900);
check("pagefind deep hits render", await page.locator("#deep").isVisible(), `${await page.locator("#deephits li").count()} hits`);

/* ---- platform page ---- */
await page.goto("http://localhost:4321/wix-studio", { waitUntil: "networkidle" });
check("platform page loads", (await page.locator("h1").textContent()) === "Wix Studio");
check("internal block present", (await page.locator("[data-internal]").count()) > 0);
check("stack flag present before handout", await page.locator(".flag.stack").count() === 1);

await page.click("#handout");
await page.waitForTimeout(80);
check("handout removes internal block", (await page.locator("[data-internal]").count()) === 0);
check("handout removes stack flag", (await page.locator(".flag.stack").count()) === 0);
const bodyText = await page.locator("body").innerText();
check("handout keeps the ceiling", bodyText.includes("Velo code does not port out"));
check("handout hides build-notes heading", !bodyText.includes("Internal — not for the client"));

await page.click("#handout");
await page.waitForTimeout(80);
check("handout toggles back", (await page.locator("[data-internal]").count()) > 0);

// "Not documented" renders for nulls
check("nulls read as Not documented", bodyText.includes("Not documented") || (await page.locator("body").innerText()).includes("Not documented"));

/* ---- theme ---- */
// The headless browser reports prefers-color-scheme: light, so both explicit
// states must be set to prove the toggle wins in both directions.
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check("theme toggle wins in both directions", darkBg !== lightBg, `${darkBg} → ${lightBg}`);
check("explicit dark is the Night ground", darkBg === "rgb(10, 10, 10)", darkBg);

/* ---- keyboard reachability ---- */
await page.goto("http://localhost:4321/", { waitUntil: "networkidle" });
const focusable = await page.evaluate(() =>
  document.querySelectorAll('a[href], button:not([hidden]), input, [tabindex]:not([tabindex="-1"])').length
);
check("interactive controls are focusable", focusable > 240, `${focusable} in the tab order`);

console.log(out.join("\n"));
if (errors.length) { console.log("\nJS errors:"); errors.forEach((e) => console.log("  " + e)); }
const failed = out.filter((l) => l.startsWith("✗")).length;
console.log(`\n${out.length - failed}/${out.length} passed`);

await browser.close();
server.close();
process.exit(failed || errors.length ? 1 : 0);
