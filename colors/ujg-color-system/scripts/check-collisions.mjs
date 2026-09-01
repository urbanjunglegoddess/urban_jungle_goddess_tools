// Guards against silently-shadowed tokens: two sections share the
// --ujg-gradient-* property namespace and the .ujg-trio-* class namespace.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2];
const css = fs.readFileSync(path.join(ROOT, 'web/ujg-colors.css'), 'utf8');
const ts = fs.readFileSync(path.join(ROOT, 'react/ujgColors.ts'), 'utf8');
let bad = 0;

const dupes = (list) => {
  const seen = new Set(), dup = new Set();
  for (const x of list) (seen.has(x) ? dup : seen).add(x);
  return [...dup];
};
const report = (label, list) => {
  const d = dupes(list);
  console.log(`  ${label.padEnd(46)} ${String(list.length).padStart(4)} ${d.length ? 'DUPLICATES: ' + d.join(', ') : 'unique'}`);
  if (d.length) bad++;
};

// :root custom properties only
const root = /:root \{([\s\S]*?)\n\}/.exec(css)[1];
report(':root custom properties', [...root.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]));

// class selectors
report('CSS class selectors', [...css.matchAll(/^\.([a-z0-9-]+) \{/gm)].map((m) => m[1]));

// scheme-scoped vars must not leak into :root
const leaked = [...root.matchAll(/--ujg-scheme-\d+/g)];
console.log(`  ${'scheme vars leaked into :root'.padEnd(46)} ${String(leaked.length).padStart(4)} ${leaked.length ? 'LEAK' : 'none'}`);
if (leaked.length) bad++;

// TS object keys and array slugs
for (const block of ['ujgColors', 'ujgRoles']) {
  const m = new RegExp('export const ' + block + ' = \\{([\\s\\S]*?)\\n\\} as const;').exec(ts);
  report('TS ' + block + ' keys', [...m[1].matchAll(/^ {2}([A-Za-z0-9]+):/gm)].map((x) => x[1]));
}
for (const a of ['ujgTrios', 'ujgGradients', 'ujgMoods', 'ujgTechEarthGradients', 'ujgTechEarthTrios', 'ujgThemed']) {
  const m = new RegExp('export const ' + a + ' = \\[([\\s\\S]*?)\\n\\] as const').exec(ts);
  report('TS ' + a + ' slugs', [...m[1].matchAll(/slug: "([^"]+)"/g)].map((x) => x[1]));
}

// cross-section namespace overlap (the two real risks)
const slugsOf = (a) => {
  const m = new RegExp('export const ' + a + ' = \\[([\\s\\S]*?)\\n\\] as const').exec(ts);
  return [...m[1].matchAll(/slug: "([^"]+)"/g)].map((x) => x[1]);
};
for (const [a, b, ns] of [
  ['ujgGradients', 'ujgTechEarthGradients', '--ujg-gradient-*'],
  ['ujgTrios', 'ujgTechEarthTrios', '.ujg-trio-*'],
]) {
  const overlap = slugsOf(a).filter((s) => slugsOf(b).includes(s));
  console.log(`  ${(ns + ' overlap ' + a + '/' + b).padEnd(46)} ${String(overlap.length).padStart(4)} ${overlap.length ? 'COLLISION: ' + overlap.join(', ') : 'none'}`);
  if (overlap.length) bad++;
}

console.log(bad ? `\n${bad} collision problem(s)` : '\nNo collisions.');
process.exit(bad ? 1 : 0);
