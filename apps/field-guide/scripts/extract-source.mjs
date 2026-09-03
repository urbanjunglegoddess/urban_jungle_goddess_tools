/**
 * Reads the frozen original Field Guide and returns its data structures.
 *
 * The source is a single HTML file whose data lives in plain JS array
 * literals. Rather than regex the records apart field by field — which would
 * silently drop anything with an escaped quote — the literals are evaluated in
 * a bare VM context with no globals. Nothing in that file calls anything.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
export const SOURCE_PATH = join(here, "..", "reference", "website_chooser.source.html");

/** Slice out `const <name> = <literal>;` and evaluate just the literal. */
function literal(html, name) {
  const open = html.indexOf(`const ${name} = `);
  if (open === -1) throw new Error(`extract: could not find "const ${name}" in the source`);
  const start = html.indexOf(name.length ? "=" : "=", open) + 1;

  // Walk to the matching close bracket, skipping anything inside a string.
  let depth = 0;
  let inStr = null;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`extract: unbalanced brackets reading ${name}`);

  return vm.runInNewContext(`(${html.slice(start, end)})`, Object.create(null), {
    timeout: 5000,
  });
}

export function readSource() {
  const html = readFileSync(SOURCE_PATH, "utf8");
  return {
    html,
    CAT: literal(html, "CAT"),
    BAND: literal(html, "BAND"),
    /* n, cats, type, skill, status, desc, bestFor, flag, band, whoEdits, exit, ceiling, verifiedPrice */
    D: literal(html, "D"),
    CMP: literal(html, "CMP"),
    SHORT: literal(html, "SHORT"),
  };
}

/** The 13 positional fields of a D row, named. */
export const FIELDS = [
  "name",
  "categories",
  "hostingType",
  "skillLevel",
  "status",
  "description",
  "bestFor",
  "flag",
  "costBand",
  "whoEditsIt",
  "exitPath",
  "ceiling",
  "verifiedPrice",
];

export function toRecord(row) {
  const out = {};
  FIELDS.forEach((f, i) => (out[f] = row[i]));
  return out;
}
