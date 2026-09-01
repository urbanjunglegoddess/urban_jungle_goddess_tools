// Proves the generated files contain nothing the source HTML does not.
import fs from 'node:fs';
import path from 'node:path';

const HTML = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');
const ROOT = process.argv[3];
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'ujg-colors.json'), 'utf8'));

const ent = (s) =>
  s.replace(/&deg;/g, '°').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
   .replace(/&mdash;/g, '—').replace(/&middot;/g, '·').replace(/&rarr;/g, '→');
// Two corpora: the raw markup (so style-attribute values like linear-gradient(...)
// are findable) and the tag-stripped text (so copy that wraps inline <span>/<strong>
// is findable). A value is faithful if it appears in either.
const flat = ent(HTML).replace(/\s+/g, ' ');
const prose = ent(HTML).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');

let checks = 0, fails = 0;
const must = (needle, what) => {
  checks++;
  if (!flat.includes(needle) && !prose.includes(needle)) {
    fails++;
    console.log('  MISSING FROM SOURCE: ' + what + ' -> ' + JSON.stringify(needle));
  }
};

// 1. every colour: name, role, swatch, and every single value string
for (const c of [...DATA.core, ...DATA.functional, ...DATA.extended]) {
  must(c.name, `${c.name} name`);
  must(c.role, `${c.name} role`);
  must(c.swatch, `${c.name} swatch`);
  for (const s of c.systems) must(c.values[s], `${c.name}.${s}`);
}
// 2. functional mapping rows
for (const m of DATA.mapping) { must(m.roleLabel, 'role ' + m.role); must(m.hex, m.role + ' hex'); }
// 3. every scheme name + full description + every hex, in order
for (const [k, arr] of Object.entries(DATA)) {
  if (!Array.isArray(arr)) continue;
  if (['core', 'functional', 'extended', 'mapping'].includes(k)) continue;
  for (const t of arr) {
    must(t.name, `${k}: ${t.name}`);
    if (t.description) must(t.description, `${k}: ${t.name} description`);
    if (t.usage) must(t.usage, `${k}: ${t.name} usage`);
    if (t.css) must(t.css, `${k}: ${t.name} css`);
    for (const h of t.colors) must(h, `${k}: ${t.name} ${h}`);
  }
}
// 4. front matter
for (const k of ['title', 'heading', 'kicker', 'lead', 'goldenRule', 'note'])
  must(DATA.meta[k], 'meta.' + k);

// 5. no hex appears in a generated file that is absent from the source
const srcHexes = new Set((ent(HTML).match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase()));
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'scripts') walk(p); }
    else if (/\.(css|ts|json)$/.test(e.name)) files.push(p);
  }
})(ROOT);
let strays = 0;
for (const f of files) {
  const body = fs.readFileSync(f, 'utf8');
  for (const h of new Set((body.match(/#[0-9A-Fa-f]{6}/g) || []).map((x) => x.toUpperCase()))) {
    checks++;
    if (!srcHexes.has(h)) { strays++; fails++; console.log('  STRAY HEX ' + h + ' in ' + path.relative(ROOT, f)); }
  }
}

// 6. counts
const expect = { core: 6, functional: 2, extended: 7, mapping: 11, trios: 20, gradients: 20,
  moods: 20, techEarthGradients: 20, techEarthTrios: 20, themed: 20 };
for (const [k, n] of Object.entries(expect)) {
  checks++;
  if (DATA[k].length !== n) { fails++; console.log(`  COUNT ${k}: ${DATA[k].length} != ${n}`); }
}

// 7. every core/extended colour reachable from each framework token file
for (const f of files.filter((x) => x.endsWith('.ts'))) {
  const body = fs.readFileSync(f, 'utf8');
  for (const c of [...DATA.core, ...DATA.functional, ...DATA.extended]) {
    checks++;
    if (!body.includes(c.swatch)) { fails++; console.log('  ' + path.relative(ROOT, f) + ' missing ' + c.name); }
  }
}

console.log(`\n${checks} checks, ${fails} failures, ${strays} stray hexes`);
console.log(`source hexes: ${srcHexes.size} distinct`);
process.exit(fails ? 1 : 0);
