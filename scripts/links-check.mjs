/**
 * Every internal link on the assembled site points at something that exists.
 *
 * This is the check that makes the single-project layout safe. Four apps now
 * share one origin, each under a prefix, and Astro does not rewrite hrefs that
 * were typed by hand — so a link written as "/about" instead of path("/about")
 * still builds, still looks right in review, and 404s in production. Grepping
 * the source would only catch the shapes I thought to grep for. Walking the
 * built HTML and resolving every link catches all of them.
 *
 * Clean URLs are honoured the way Vercel serves them: /x resolves to x.html.
 *
 *   pnpm build && pnpm links
 */
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("links-check: no dist/ — run the build first.");
  process.exit(1);
}

async function walk(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Resolve a site-absolute path the way the host will serve it. */
function resolves(p) {
  const clean = p.split("#")[0].split("?")[0];
  const f = join(dist, decodeURIComponent(clean));
  if (existsSync(f)) return true;                       // exact file, or a directory
  if (existsSync(f + ".html")) return true;             // cleanUrls: /x -> x.html
  if (existsSync(join(f, "index.html"))) return true;   // directory index
  return false;
}

const pages = await walk(dist);
const broken = [];
let links = 0;

// href= and src= with a site-absolute value. Protocol-relative (//host) excluded.
const ATTR = /(?:href|src)\s*=\s*"(\/(?!\/)[^"]*)"/g;

for (const page of pages) {
  const html = await readFile(page, "utf8");
  for (const m of html.matchAll(ATTR)) {
    const target = m[1];
    links++;
    if (!resolves(target)) {
      broken.push({ page: relative(dist, page), target });
    }
  }
}

if (broken.length) {
  // Group by target: one mistyped link in a component shows up on 228 pages.
  const byTarget = new Map();
  for (const b of broken) {
    const e = byTarget.get(b.target) ?? { n: 0, first: b.page };
    e.n++;
    byTarget.set(b.target, e);
  }
  console.error(`links-check: ${broken.length} broken link(s) across ${byTarget.size} distinct target(s):\n`);
  for (const [target, e] of [...byTarget].sort((a, b) => b[1].n - a[1].n)) {
    console.error(`  ✗ ${target}  — ×${e.n}, e.g. on /${e.first}`);
  }
  console.error("\nInternal links must go through path() so they carry the app's base prefix.");
  process.exit(1);
}

console.log(
  `links-check: ${links} internal links across ${pages.length} pages — every one resolves to a file that exists.`
);
