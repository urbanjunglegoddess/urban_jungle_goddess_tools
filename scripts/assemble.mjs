/**
 * Assemble the four apps into one site.
 *
 * Every app builds independently into its own dist/, each already knowing the
 * prefix it will be served under (astro.config.mjs `base`). This copies those
 * outputs into a single dist/ at the repo root:
 *
 *   dist/                  <- apps/home/dist
 *   dist/field-guide/      <- apps/field-guide/dist
 *   dist/focus/            <- apps/focus/dist
 *   dist/layout-lab/       <- apps/layout-lab/dist
 *
 * The home app goes last and is not allowed to overwrite anything: if it ever
 * emitted a file called field-guide.html it would shadow the whole Field Guide,
 * and that is the kind of failure you find in production rather than in a diff.
 *
 *   pnpm build
 */
import { cp, rm, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");

/** Each app, and the prefix it is served under. Must match its astro `base`. */
const APPS = [
  { pkg: "field-guide", prefix: "field-guide" },
  { pkg: "focus", prefix: "focus" },
  { pkg: "layout-lab", prefix: "layout-lab" },
  { pkg: "home", prefix: "" },
];

async function count(dir) {
  let n = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? await count(join(dir, e.name)) : 1;
  }
  return n;
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const claimed = new Set();
const report = [];

for (const { pkg, prefix } of APPS) {
  const src = join(root, "apps", pkg, "dist");
  if (!existsSync(src)) {
    console.error(`assemble: apps/${pkg}/dist is missing — build it first.`);
    process.exit(1);
  }
  const dest = prefix ? join(out, prefix) : out;

  // The root app lands on top of the others, so it must not collide with them.
  if (!prefix) {
    for (const e of await readdir(src)) {
      if (claimed.has(e)) {
        console.error(
          `assemble: the home app emits "${e}", which would shadow the app served at /${e}.` +
            `\n  Rename the page, or give that app a different prefix.`
        );
        process.exit(1);
      }
    }
  } else {
    claimed.add(prefix);
  }

  await cp(src, dest, { recursive: true });
  report.push({ pkg, prefix: prefix || "(root)", files: await count(src) });
}

const total = await count(out);
console.log("assemble: one site from four builds —");
for (const r of report) console.log(`  /${r.prefix === "(root)" ? "" : r.prefix + "/"}  ${String(r.files).padStart(5)} files  ${r.pkg}`);
console.log(`  ${total} files in dist/`);

// A site whose front door is missing is not a site.
if (!existsSync(join(out, "index.html"))) {
  console.error("assemble: dist/index.html is missing — the home app did not build a front door.");
  process.exit(1);
}
