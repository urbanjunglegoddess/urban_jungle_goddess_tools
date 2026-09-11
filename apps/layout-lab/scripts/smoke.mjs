/**
 * Do the demos actually work?
 *
 * A layout demo that looks right in a screenshot and does nothing when you
 * touch it is worse than a wireframe, because it claims more. These are the
 * behaviours each interactive demo promises, driven in a real browser.
 *
 * The last block is the one that matters most across all twenty-four: at 380
 * pixels, nothing may scroll sideways. Several of these layouts are built from
 * transforms, absolute positioning and off-canvas type — exactly the techniques
 * that leak a horizontal scrollbar — so it is checked everywhere, every time.
 *
 *   pnpm build && pnpm smoke
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const PORT = 4325;
const BASE = `http://localhost:${PORT}`;

const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  // In production this app is served under /layout-lab/, so its built asset
  // URLs carry that prefix. dist/ here is the app on its own, so strip it.
  if (p === "/layout-lab" || p.startsWith("/layout-lab/")) p = p.slice(11) || "/";
  if (p === "/") p = "/index.html";
  let f = join(DIST, p);
  if (!existsSync(f) && existsSync(f + ".html")) f = f + ".html";
  if (!existsSync(f)) { res.writeHead(404); return res.end(); }
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

async function open(path, viewport = { width: 1280, height: 820 }) {
  const page = await browser.newPage({ viewport });
  // Google Fonts is blocked in the sandbox; a hanging request would stall load.
  await page.route("**/*", (r) =>
    r.request().url().startsWith(BASE) ? r.continue() : r.abort()
  );
  /* The route filter above aborts Google Fonts, and Chromium reports that
     abort as a console error. Filtering it keeps genuine page errors visible
     instead of drowning them in twenty-four copies of our own doing. */
  const mine = (t) => /ERR_FAILED|ERR_BLOCKED|Failed to load resource/i.test(t);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !mine(m.text())) errors.push(m.text()); });
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(250);
  return { page, errors };
}

/* ---------------- horizontal-scroll toggle ---------------- */
{
  const { page, errors } = await open("/demo/hscroll");
  const btn = page.locator("#mode");
  ok("hscroll: starts vertical", (await btn.getAttribute("aria-pressed")) === "false");
  await btn.click();
  ok("hscroll: toggle reports on", (await btn.getAttribute("aria-pressed")) === "true");
  ok("hscroll: body enters sideways mode", await page.locator("body.sideways").count() === 1);
  const spacer = await page.locator("#spacer").evaluate((el) => el.style.height);
  ok("hscroll: scroll length derived from the rail", /\d+px/.test(spacer) && parseInt(spacer) > 800);
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(120);
  const tx = await page.locator("#rail").evaluate((el) => el.style.transform);
  ok("hscroll: scrolling down moves the rail sideways", /translate3d\(-\d+px/.test(tx));
  await btn.click();
  ok("hscroll: toggling back clears the transform", (await page.locator("#rail").evaluate((el) => el.style.transform)) === "");
  ok("hscroll: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- scrollytelling ---------------- */
{
  const { page, errors } = await open("/demo/scrolly");
  const scene = page.locator("#scene");
  ok("scrolly: opens on the first step", (await scene.getAttribute("data-step")) === "s1");
  await page.locator("#s4").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  ok("scrolly: the pinned visual follows the last step", (await scene.getAttribute("data-step")) === "s4");
  ok("scrolly: exactly one step is marked current", await page.locator(".step.on").count() === 1);
  ok("scrolly: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- command palette ---------------- */
{
  const { page, errors } = await open("/demo/cmdk");
  await page.waitForTimeout(900); // the first-visit opening
  ok("cmdk: opens itself once, for discoverability", await page.locator("#pal[open]").count() === 1);
  const all = await page.locator("#results button").count();
  ok("cmdk: lists every action", all >= 10);
  await page.locator("#q").fill("harbour");
  await page.waitForTimeout(80);
  ok("cmdk: filters as you type", await page.locator("#results button").count() < all);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  ok("cmdk: enter closes the palette", await page.locator("#pal[open]").count() === 0);
  ok("cmdk: enter jumps to the section", await page.evaluate(() => window.scrollY) > 100);
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(120);
  ok("cmdk: the shortcut reopens it", await page.locator("#pal[open]").count() === 1);
  ok("cmdk: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- terminal ---------------- */
{
  const { page, errors } = await open("/demo/terminal");
  const out = page.locator("#out");
  ok("terminal: greets on load", (await out.innerText()).length > 20);
  await page.locator("#cmd").fill("services");
  await page.locator("#cmd").press("Enter");
  await page.waitForTimeout(120);
  const text = await out.innerText();
  ok("terminal: answers from the page's own content", text.includes("Identity") && text.includes("Motion"));
  await page.locator('#chips button[data-cmd="clear"]').click();
  await page.waitForTimeout(80);
  ok("terminal: clear empties the log", (await out.innerText()).trim() === "");
  await page.locator("#cmd").fill("nonsense");
  await page.locator("#cmd").press("Enter");
  await page.waitForTimeout(80);
  ok("terminal: unknown commands point at help", (await out.innerText()).includes("try help"));
  ok("terminal: the whole site is present without typing", await page.locator("#gui h2").count() >= 5);
  ok("terminal: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- infinite canvas ---------------- */
{
  const { page, errors } = await open("/demo/infinite");
  const canvas = page.locator("#canvas");
  const before = await canvas.evaluate((el) => el.style.transform);
  await page.locator("#viewport").hover();
  await page.mouse.down();
  await page.mouse.move(500, 400);
  await page.mouse.up();
  await page.waitForTimeout(100);
  ok("infinite: dragging pans the canvas", (await canvas.evaluate((el) => el.style.transform)) !== before);
  await page.locator("#reset").click();
  await page.waitForTimeout(80);
  ok("infinite: reset returns to the start view", (await canvas.evaluate((el) => el.style.transform)) === before);
  await page.locator("#zin").click();
  await page.waitForTimeout(80);
  ok("infinite: zoom in changes the readout", (await page.locator("#zlabel").innerText()) !== "100%");
  ok("infinite: onboarding is shown", await page.locator("#onboard:not([hidden])").count() === 1);
  await page.locator("#gotit").click();
  ok("infinite: onboarding can be dismissed", await page.locator("#onboard:not([hidden])").count() === 0);
  ok("infinite: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- split-screen dual scroll ---------------- */
{
  const { page, errors } = await open("/demo/dualscroll");
  const a = page.locator(".side.a");
  const b = page.locator(".side.b");
  await a.evaluate((el) => el.scrollBy(0, 220));
  await page.waitForTimeout(100);
  const at = await a.evaluate((el) => el.scrollTop);
  const bt = await b.evaluate((el) => el.scrollTop);
  ok("dualscroll: one side scrolls", at > 100);
  ok("dualscroll: the other side does not follow", Math.abs(bt - at) > 50 || bt === 0);
  ok("dualscroll: both panes are keyboard-reachable", await page.locator('.side[tabindex="0"]').count() === 2);
  ok("dualscroll: no script errors", errors.length === 0);
  await page.close();
}

/* ---------------- reduced motion is honoured, not merely declared ---------------- */
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto(BASE + "/demo/kinetic", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(200);
  const anim = await page.locator(".band .run").first().evaluate((el) => getComputedStyle(el).animationName);
  ok("kinetic: the marquee stops under reduced motion", anim === "none");

  await page.goto(BASE + "/demo/parallax", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(200);
  const t = await page.locator(".l-mid").evaluate((el) => el.style.transform);
  ok("parallax: layers do not move under reduced motion", t === "");

  await page.goto(BASE + "/demo/hscroll", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);
  await page.locator("#mode").click();
  ok("hscroll: sideways refuses to engage under reduced motion",
     (await page.locator("#mode").getAttribute("aria-pressed")) === "false");
  await page.close();
}

/* ---------------- every demo, at phone width ---------------- */
{
  const slugs = readdirSync(join(here, "..", "src", "pages", "demo"))
    .filter((f) => f.endsWith(".astro"))
    .map((f) => f.replace(/\.astro$/, ""));

  for (const slug of slugs) {
    const { page, errors } = await open(`/demo/${slug}`, { width: 380, height: 760 });
    await page.waitForTimeout(150);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${slug}: no horizontal scroll at 380px (overflow ${over}px)`, over <= 1);
    ok(`${slug}: the way back is reachable`, await page.locator(".lab-chip").count() === 1);
    ok(`${slug}: no script errors at phone width`, errors.length === 0);
    await page.close();
  }
}

await browser.close();
server.close();

if (problems.length) {
  console.error(`smoke: ${problems.length} failure(s) of ${checks} checks:\n`);
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}
console.log(`smoke: ${checks}/${checks} — every interactive demo does what its page says it does.`);
