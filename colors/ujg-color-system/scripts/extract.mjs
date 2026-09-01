// Extracts the UJG colour system from the reference HTML into canonical JSON.
// Every value is reproduced verbatim — no conversion, no correction.
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = process.argv[3];
const raw = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');

const ent = (s) =>
  s
    .replace(/&deg;/g, '°')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/&rarr;/g, '→')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
const txt = (s) => ent(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[·—→]/g, ' ')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const camel = (s) => {
  const p = slug(s).split('-');
  return p[0] + p.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
};

const parts = raw.split(/<h2>/).slice(1);
const sections = parts.map((p) => {
  const i = p.indexOf('</h2>');
  return { title: txt(p.slice(0, i)), body: p.slice(i + 5) };
});
const S = (t) => {
  const s = sections.find((x) => x.title === t);
  if (!s) throw new Error('missing section: ' + t);
  return s.body;
};

// Cards are split on their opening tag rather than matched with a closing-tag
// boundary: the markup nests <div>s inconsistently (some cards are pretty-printed
// across lines, some are single-line), so a lazy </div> boundary truncates them.
function cards(body, cls) {
  return body.split(new RegExp('<div class="' + cls + '">')).slice(1);
}

const VAL_RE =
  /<div class="v"><span class="l">([\s\S]*?)<\/span><span class="d( approx)?">([\s\S]*?)<\/span><\/div>/g;

function readValues(chunk) {
  const values = {};
  const systems = [];
  const approximate = [];
  let v;
  VAL_RE.lastIndex = 0;
  while ((v = VAL_RE.exec(chunk))) {
    const k = txt(v[1]);
    values[k] = txt(v[3]);
    systems.push(k);
    if (v[2]) approximate.push(k);
  }
  return { values, systems, approximate };
}

function parseCards(body) {
  const out = [];
  for (const c of cards(body, 'card')) {
    const bg = /class="chip"[^>]*background:\s*(#[0-9A-Fa-f]{6})/.exec(c);
    const rl = /<span class="rl"[^>]*>([\s\S]*?)<\/span>/.exec(c);
    const nm = /<span class="nm"[^>]*>([\s\S]*?)<\/span>/.exec(c);
    const name = txt(nm[1]);
    out.push({
      name,
      slug: slug(name),
      key: camel(name),
      role: txt(rl[1]),
      swatch: bg[1].toUpperCase(),
      ...readValues(c),
    });
  }
  return out;
}

function parseMini(body) {
  const out = [];
  for (const c of cards(body, 'minicard')) {
    const ch = /<div class="minichip"[^>]*background:\s*(#[0-9A-Fa-f]{6})[^>]*>([\s\S]*?)<\/div>/.exec(c);
    const label = txt(ch[2]);
    const [name, role] = label.split('·').map((s) => s.trim());
    out.push({
      name,
      slug: slug(name),
      key: camel(name),
      role,
      label,
      swatch: ch[1].toUpperCase(),
      ...readValues(c),
    });
  }
  return out;
}

function parseMap(body) {
  const out = [];
  const re = /<tr><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g;
  let m;
  while ((m = re.exec(body))) {
    const roleLabel = txt(m[1]);
    const cell = m[2];
    const mono = /<span class="mono">([\s\S]*?)<\/span>/.exec(cell);
    const dot = /background:\s*(#[0-9A-Fa-f]{6})/.exec(cell);
    const color = txt(cell.replace(/<span class="mono">[\s\S]*?<\/span>/, ''));
    const [role, usage] = roleLabel.split('—').map((s) => s.trim());
    out.push({
      role,
      usage: usage || null,
      roleLabel,
      roleSlug: slug(role),
      roleKey: camel(role),
      color,
      colorSlug: slug(color),
      colorKey: camel(color),
      hex: (mono ? txt(mono[1]) : dot[1]).toUpperCase(),
    });
  }
  return out;
}

function parseTrios(body) {
  const out = [];
  for (const c of cards(body, 'tcard')) {
    const colors = [];
    const sre = /<span style="background:\s*(#[0-9A-Fa-f]{6});[^"]*">([\s\S]*?)<\/span>/g;
    let s;
    while ((s = sre.exec(c))) colors.push(s[1].toUpperCase());
    const label = txt(/<div class="t">([\s\S]*?)<\/div>/.exec(c)[1]);
    const description = txt(/<div class="d">([\s\S]*?)<\/div>/.exec(c)[1]);
    const num = /^(\d+)\s*·\s*(.*)$/.exec(label);
    const name = num ? num[2] : label;
    const [mix, usage] = description.split('—').map((x) => x.trim());
    out.push({
      id: num ? num[1] : null,
      name,
      slug: slug(name),
      key: camel(name),
      label,
      colors,
      mix,
      usage: usage || null,
      description,
    });
  }
  return out;
}

function parseGradients(body) {
  const out = [];
  for (const c of cards(body, 'gcard')) {
    const css = /background:\s*(linear-gradient\([^;"]*\))/.exec(c)[1];
    const angle = /linear-gradient\(\s*([0-9]+deg)/.exec(css)[1];
    const colors = (css.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase());
    const name = txt(/<div class="t">([\s\S]*?)<\/div>/.exec(c)[1]);
    const usage = txt(/<div class="d">([\s\S]*?)<\/div>/.exec(c)[1]);
    const r = /<div class="r">([\s\S]*?)<\/div>/.exec(c);
    out.push({
      name,
      slug: slug(name),
      key: camel(name),
      angle,
      colors,
      recipe: r ? txt(r[1]) : null,
      usage,
      css,
    });
  }
  return out;
}

function parsePalettes(body) {
  const out = [];
  for (const c of cards(body, 'scard')) {
    const bars = c.slice(0, c.indexOf('</div>'));
    const colors = (bars.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase());
    const label = txt(/<div class="t">([\s\S]*?)<\/div>/.exec(c)[1]);
    const description = txt(/<div class="d">([\s\S]*?)<\/div>/.exec(c)[1]);
    const [mix, usage] = description.split('—').map((x) => x.trim());
    const [name, register] = label.split('·').map((x) => x.trim());
    out.push({
      name,
      register: register || null,
      label,
      slug: slug(name),
      key: camel(name),
      colors,
      mix,
      usage: usage || null,
      description,
    });
  }
  return out;
}

const grab = (re) => {
  const m = re.exec(raw);
  return m ? txt(m[1]) : null;
};

const data = {
  meta: {
    source: path.basename(SRC),
    title: grab(/<title>([\s\S]*?)<\/title>/),
    heading: grab(/<h1>([\s\S]*?)<\/h1>/),
    kicker: grab(/<div class="kicker">([\s\S]*?)<\/div>/),
    lead: grab(/<div class="lead">([\s\S]*?)<\/div>/),
    goldenRule: grab(/<div class="rule">([\s\S]*?)<\/div>/),
    note: grab(/<div class="note">([\s\S]*?)<\/div>/),
    fidelity:
      'Extracted verbatim from the reference HTML. Values are reproduced exactly as written, including the RAL / Copic / HKS / Prismacolor approximations.',
  },
  core: parseCards(S('Core Palette — Full Values')),
  functional: parseMini(S('Functional Support Colors')),
  extended: parseCards(S('Extended Palette — Earth Tones (Secondary)')),
  mapping: parseMap(S('Functional Mapping')),
  trios: parseTrios(S('Color Schemes — 20 Trios')),
  gradients: parseGradients(S('Gradients')),
  moods: parsePalettes(S('Mood Palettes — 20')),
  techEarthGradients: parseGradients(S('Tech + Earth Gradients')),
  techEarthTrios: parseTrios(S('Tech + Earth Schemes')),
  themed: parsePalettes(S('Themed Palettes (Tech + Earth)')),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');

const groups = [
  'core', 'functional', 'extended', 'mapping', 'trios',
  'gradients', 'moods', 'techEarthGradients', 'techEarthTrios', 'themed',
];
console.log('EXTRACTED  ->  ' + OUT);
for (const k of groups) console.log('  ' + k.padEnd(20) + data[k].length);
console.log('\nSPOT CHECKS');
console.log('  core[0]    ' + JSON.stringify(data.core[0]));
console.log('  extended[6]' + JSON.stringify(data.extended[6]));
console.log('  functional[1] ' + JSON.stringify(data.functional[1]));
console.log('  mapping[4] ' + JSON.stringify(data.mapping[4]));
console.log('  trios[0]   ' + JSON.stringify(data.trios[0]));
console.log('  gradients[0] ' + JSON.stringify(data.gradients[0]));
console.log('  moods[0]   ' + JSON.stringify(data.moods[0]));
console.log('  themed[0]  ' + JSON.stringify(data.themed[0]));
