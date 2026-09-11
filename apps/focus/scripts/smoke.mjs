/**
 * Browser smoke test for the built Focus Window.
 *
 * The core check proves the arithmetic; this proves the shell actually wires it
 * up — that the compare grid renders, that tapping a style in Combined rebuilds
 * the plan beneath it, that blocks land on sessions in order, and that Start
 * locks the run to the clock and Stop returns to planning.
 *
 *   pnpm build && pnpm smoke
 *
 * Not part of `pnpm check` — it needs a Chromium binary. Set CHROMIUM_PATH if
 * Playwright's own download is not present.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  // In production this app is served under /focus/, so its built asset
  // URLs carry that prefix. dist/ here is the app on its own, so strip it.
  if (p === "/focus" || p.startsWith("/focus/")) p = p.slice(6) || "/";
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (!existsSync(f)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(4327, r));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const out = [];
const errors = [];
const check = (name, ok, detail = "") => out.push(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);

const page = await browser.newPage({ viewport: { width: 720, height: 1100 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => {
  // The route handler below aborts every off-origin request, which the page
  // then reports as a failed resource. That noise is this test's own doing —
  // filtering it keeps a genuine console error visible instead of buried.
  if (m.type() === "error" && !m.text().includes("net::ERR_FAILED")) {
    errors.push("console: " + m.text());
  }
});
// The sandbox blocks Google Fonts and the hanging request stops networkidle
// from ever settling.
await page.route("**/*", (r) =>
  r.request().url().startsWith("http://localhost:4327") ? r.continue() : r.abort()
);

/** Put a known window in so every assertion below is deterministic. */
async function setLength(h, m) {
  await page.click('#modeTog button[data-mode="length"]');
  await page.fill("#hh", String(h));
  await page.fill("#mm", String(m));
  await page.click('#bufChips .chip[data-b="0"]');
  await page.waitForTimeout(120);
}

/* ---------- Fit ---------- */
await page.goto("http://localhost:4327/fit", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await setLength(2, 0);

const cards = await page.locator("#compare .res").count();
check("fit renders every style", cards === 7, `${cards} of 7`);

// 120 minutes, Classic 25/5: 25+5+25+5+25+5+25 = 115 → 4 sessions, 3 breaks.
const classic = page.locator("#compare .res", { hasText: "Classic" }).first();
const sessions = await classic.locator(".stat .v").first().textContent();
check("fit computes Classic in 2h", sessions.trim() === "4", `${sessions.trim()} sessions`);

check("fit has no dial", (await page.locator("#compare button.res").count()) === 0);
check("fit has no block list", (await page.locator("#blockList").count()) === 0);

/* ---------- Planner ---------- */
await page.goto("http://localhost:4327/planner", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await setLength(1, 0);

await page.fill("#blockInput", "Draft the proposal");
await page.click("#addBtn");
await page.fill("#blockInput", "Invoice run");
await page.click("#addBtn");
await page.waitForTimeout(150);

check("blocks add", (await page.locator("#blockList li").count()) === 2);
const planText = await page.locator("#runCard").innerText();
check("blocks land on sessions", planText.includes("Draft the proposal") && planText.includes("Invoice run"));
check("plan shows a session count", /\d+ sessions?/.test(planText), planText.split("\n")[0]);

// Reorder: second block moves up, so it should now run first.
await page.click('#blockList li:nth-child(2) [data-up]');
await page.waitForTimeout(150);
const first = await page.locator("#blockList li:nth-child(1) .txt").textContent();
check("blocks reorder", first.trim() === "Invoice run", first.trim());

await page.click("#clearAll");
await page.waitForTimeout(150);
check("clear all empties the list", (await page.locator("#blockList li").count()) === 0);

/* ---------- Combined: the compare grid is the dial ---------- */
await page.goto("http://localhost:4327/combined", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await setLength(2, 0);

const beforeSub = await page.locator("#runSub").textContent();
await page.locator("#compare button.res", { hasText: "Sprint" }).first().click();
await page.waitForTimeout(200);
const afterSub = await page.locator("#runSub").textContent();
check("tapping a style rebuilds the plan", beforeSub !== afterSub && afterSub.includes("Sprint"), afterSub.trim());
check(
  "the tapped style is marked",
  (await page.locator('#compare button.res[aria-pressed="true"]').innerText()).includes("Sprint")
);

/* ---------- Live: start, tick, stop ---------- */
await page.goto("http://localhost:4327/live", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(400);
await setLength(2, 0);
await page.fill("#blockInput", "Ship the thing");
await page.click("#addBtn");
await page.waitForTimeout(150);

check("start button present before the run", (await page.locator("#startBtn").count()) === 1);
await page.click("#startBtn");
await page.waitForTimeout(300);

check("run replaces the plan with a live card", (await page.locator("#runCard .now").count()) === 1);
check("the live card names the current block", (await page.locator(".now-label").innerText()).includes("Ship the thing"));
check("the compare grid locks", await page.locator("#compareLock").isVisible());

const t1 = await page.locator(".count").innerText();
await page.waitForTimeout(1600);
const t2 = await page.locator(".count").innerText();
check("the counter ticks down", t1 !== t2, `${t1.split("\n")[0]} → ${t2.split("\n")[0]}`);

// A run must survive a reload — it is pinned to the wall clock, not to the tab.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
check("the run survives a reload", (await page.locator("#runCard .now").count()) === 1);

await page.click("#stopBtn");
await page.waitForTimeout(250);
check("stop returns to planning", (await page.locator("#startBtn").count()) === 1);
check("the compare grid unlocks", !(await page.locator("#compareLock").isVisible()));

/* ---------- no horizontal scroll at phone width ---------- */
await page.setViewportSize({ width: 380, height: 900 });
await page.waitForTimeout(250);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
);
check("no horizontal scroll at 380px", !overflow);

console.log(out.join("\n"));
if (errors.length) {
  console.log("\nJS errors:");
  for (const e of errors) console.log("  " + e);
}
const failed = out.filter((l) => l.startsWith("✗")).length;
console.log(`\n${out.length - failed}/${out.length} passed`);

await browser.close();
server.close();
process.exit(failed || errors.length ? 1 : 0);
