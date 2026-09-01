// Generates the per-framework colour files from ujg-colors.json.
// Nothing here invents or corrects a value — it only reshapes them.
import fs from 'node:fs';
import path from 'node:path';

const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ROOT = process.argv[3];

const w = (rel, body) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body.replace(/\n*$/, '\n'), 'utf8');
  console.log('  ' + rel.padEnd(34) + fs.statSync(p).size + ' B');
};

const allColors = [...DATA.core, ...DATA.functional, ...DATA.extended];
const j = (v) => JSON.stringify(v);
const SRC = DATA.meta.source;

// ---------------------------------------------------------------- CSS ------
function css() {
  const L = [];
  L.push('/*');
  L.push(' * UJG Color System — CSS custom properties');
  L.push(` * Generated from ${SRC}. Values are verbatim; do not hand-edit.`);
  L.push(' *');
  L.push(` * ${DATA.meta.goldenRule}`);
  L.push(' */');
  L.push('');
  L.push(':root {');

  L.push('  /* --- Core palette ------------------------------------------------ */');
  for (const c of DATA.core) L.push(`  --ujg-${c.slug}: ${c.swatch}; /* ${c.role} */`);
  L.push('');
  L.push('  /* --- Functional support ------------------------------------------ */');
  for (const c of DATA.functional) L.push(`  --ujg-${c.slug}: ${c.swatch}; /* ${c.role} */`);
  L.push('');
  L.push('  /* --- Extended palette (earth tones, secondary) -------------------- */');
  for (const c of DATA.extended) L.push(`  --ujg-${c.slug}: ${c.swatch}; /* ${c.role} */`);
  L.push('');
  L.push('  /* --- Functional mapping ------------------------------------------- */');
  for (const m of DATA.mapping) {
    const note = m.usage ? ` ${m.color} — ${m.usage}` : ` ${m.color}`;
    L.push(`  --ujg-role-${m.roleSlug}: var(--ujg-${m.colorSlug}); /*${note} */`);
  }
  L.push('');
  L.push('  /* --- Gradients ----------------------------------------------------- */');
  for (const g of DATA.gradients) L.push(`  --ujg-gradient-${g.slug}: ${g.css}; /* ${g.usage} */`);
  L.push('');
  L.push('  /* --- Tech + Earth gradients ---------------------------------------- */');
  for (const g of DATA.techEarthGradients)
    L.push(`  --ujg-gradient-${g.slug}: ${g.css}; /* ${g.usage} */`);
  L.push('}');
  L.push('');

  const group = (heading, items, prefix) => {
    L.push(`/* ${heading} */`);
    for (const t of items) {
      L.push(`.${prefix}-${t.slug} {`);
      t.colors.forEach((h, i) => L.push(`  --ujg-scheme-${i + 1}: ${h};`));
      L.push(`} /* ${t.mix} */`);
    }
    L.push('');
  };
  group('Color schemes — 20 trios', DATA.trios, 'ujg-trio');
  group('Mood palettes — 20', DATA.moods, 'ujg-mood');
  group('Tech + Earth schemes — 20 trios', DATA.techEarthTrios, 'ujg-trio');
  group('Themed palettes (Tech + Earth) — 20', DATA.themed, 'ujg-palette');
  return L.join('\n');
}

// ----------------------------------------------------------- TS tokens -----
function tokens(header) {
  const L = [];
  L.push('/**');
  header.split('\n').forEach((l) => L.push(' * ' + l));
  L.push(' *');
  L.push(` * Generated from ${SRC}. Values are verbatim; do not hand-edit.`);
  L.push(` * ${DATA.meta.goldenRule}`);
  L.push(' */');
  L.push('');
  L.push('export interface UjgColor {');
  L.push('  /** Display name, exactly as written in the reference sheet. */');
  L.push('  name: string;');
  L.push('  /** kebab-case identifier, matching the CSS custom property suffix. */');
  L.push('  slug: string;');
  L.push('  /** The role this colour plays, as written in the reference sheet. */');
  L.push('  role: string;');
  L.push('  /** The hex used to paint the swatch. Same as values.HEX. */');
  L.push('  swatch: string;');
  L.push('  /** Every value system listed for this colour, keyed by system name. */');
  L.push('  values: Record<string, string>;');
  L.push('  /** Value systems in the order the reference sheet lists them. */');
  L.push('  systems: readonly string[];');
  L.push('  /**');
  L.push('   * Systems whose values are nearest physical matches, not computed.');
  L.push('   * Confirm against a fan deck before any print run.');
  L.push('   */');
  L.push('  approximate: readonly string[];');
  L.push('}');
  L.push('');
  L.push('export interface UjgScheme {');
  L.push('  name: string;');
  L.push('  slug: string;');
  L.push('  colors: readonly string[];');
  L.push('  /** The colour names, as written in the reference sheet. */');
  L.push('  mix: string;');
  L.push('  /** What the reference sheet says to use it for. */');
  L.push('  usage: string | null;');
  L.push('}');
  L.push('');
  L.push('export interface UjgGradient {');
  L.push('  name: string;');
  L.push('  slug: string;');
  L.push('  angle: string;');
  L.push('  colors: readonly string[];');
  L.push('  recipe: string | null;');
  L.push('  usage: string;');
  L.push('  /** Ready-made CSS value. Web targets only — React Native has no equivalent. */');
  L.push('  css: string;');
  L.push('}');
  L.push('');

  const colorList = (name, arr, comment) => {
    L.push(`/** ${comment} */`);
    L.push(`export const ${name} = [`);
    for (const c of arr) {
      L.push('  {');
      L.push(`    name: ${j(c.name)},`);
      L.push(`    slug: ${j(c.slug)},`);
      L.push(`    role: ${j(c.role)},`);
      L.push(`    swatch: ${j(c.swatch)},`);
      L.push(`    values: {`);
      for (const s of c.systems) L.push(`      ${j(s)}: ${j(c.values[s])},`);
      L.push('    },');
      L.push(`    systems: [${c.systems.map(j).join(', ')}],`);
      L.push(`    approximate: [${c.approximate.map(j).join(', ')}],`);
      L.push('  },');
    }
    L.push('] as const satisfies readonly UjgColor[];');
    L.push('');
  };
  colorList('ujgCore', DATA.core, 'The six core colours, each across ten value systems.');
  colorList('ujgFunctional', DATA.functional, 'Functional support colours.');
  colorList('ujgExtended', DATA.extended, 'Extended palette — earth tones (secondary).');

  L.push('/** Every colour in the system, flat, keyed by camelCase name. */');
  L.push('export const ujgColors = {');
  for (const c of allColors) L.push(`  ${c.key}: ${j(c.swatch)},`);
  L.push('} as const;');
  L.push('');
  L.push('export type UjgColorName = keyof typeof ujgColors;');
  L.push('');

  L.push('/** Semantic role -> colour. Straight from the Functional Mapping table. */');
  L.push('export const ujgRoles = {');
  for (const m of DATA.mapping) {
    const note = m.usage ? ` // ${m.color} — ${m.usage}` : ` // ${m.color}`;
    L.push(`  ${m.roleKey}: ${j(m.hex)},${note}`);
  }
  L.push('} as const;');
  L.push('');
  L.push('export type UjgRole = keyof typeof ujgRoles;');
  L.push('');

  const schemeList = (name, arr, comment) => {
    L.push(`/** ${comment} */`);
    L.push(`export const ${name} = [`);
    for (const t of arr) {
      L.push('  {');
      L.push(`    name: ${j(t.name)},`);
      L.push(`    slug: ${j(t.slug)},`);
      L.push(`    colors: [${t.colors.map(j).join(', ')}],`);
      L.push(`    mix: ${j(t.mix)},`);
      L.push(`    usage: ${t.usage === null ? 'null' : j(t.usage)},`);
      L.push('  },');
    }
    L.push('] as const satisfies readonly UjgScheme[];');
    L.push('');
  };
  const gradList = (name, arr, comment) => {
    L.push(`/** ${comment} */`);
    L.push(`export const ${name} = [`);
    for (const g of arr) {
      L.push('  {');
      L.push(`    name: ${j(g.name)},`);
      L.push(`    slug: ${j(g.slug)},`);
      L.push(`    angle: ${j(g.angle)},`);
      L.push(`    colors: [${g.colors.map(j).join(', ')}],`);
      L.push(`    recipe: ${g.recipe === null ? 'null' : j(g.recipe)},`);
      L.push(`    usage: ${j(g.usage)},`);
      L.push(`    css: ${j(g.css)},`);
      L.push('  },');
    }
    L.push('] as const satisfies readonly UjgGradient[];');
    L.push('');
  };

  schemeList('ujgTrios', DATA.trios, 'Color schemes — 20 trios.');
  gradList('ujgGradients', DATA.gradients, 'Gradients — 20.');
  schemeList('ujgMoods', DATA.moods, 'Mood palettes — 20. Four seasons plus sixteen registers.');
  gradList('ujgTechEarthGradients', DATA.techEarthGradients, 'Tech + Earth gradients — 20.');
  schemeList('ujgTechEarthTrios', DATA.techEarthTrios, 'Tech + Earth schemes — 20 trios.');
  schemeList('ujgThemed', DATA.themed, 'Themed palettes (Tech + Earth) — 20.');

  L.push('/** Front matter from the reference sheet, carried across verbatim. */');
  L.push('export const ujgMeta = {');
  for (const k of ['title', 'heading', 'kicker', 'lead', 'goldenRule', 'note'])
    L.push(`  ${k}: ${j(DATA.meta[k])},`);
  L.push(`  source: ${j(SRC)},`);
  L.push('} as const;');
  return L.join('\n');
}

// ------------------------------------------------------------ expo theme ---
function expoTheme() {
  const L = [];
  L.push('/**');
  L.push(' * Flat palette for React Native StyleSheet — plain values, no CSS variables.');
  L.push(` * Generated from ${SRC}. Values are verbatim; do not hand-edit.`);
  L.push(' */');
  L.push('');
  L.push('export const T = {');
  for (const c of allColors) L.push(`  ${c.key}: ${j(c.swatch)}, // ${c.name} — ${c.role}`);
  L.push('');
  for (const m of DATA.mapping) L.push(`  ${m.roleKey}: ${j(m.hex)}, // role: ${m.roleLabel}`);
  L.push('} as const;');
  L.push('');
  L.push('export type Theme = typeof T;');
  return L.join('\n');
}

console.log('GENERATED');
const cssBody = css();
w('ujg-colors.json', JSON.stringify(DATA, null, 2));
w('web/ujg-colors.css', cssBody);
w('react/ujg-colors.css', cssBody);
w('react/ujgColors.ts', tokens(
  'UJG Color System — React (Vite / CRA / any bundler).\n' +
  "Copy this file and ujg-colors.css into your project, then `import './ujg-colors.css'`\n" +
  'once at your app root. This module is plain data — safe to import anywhere.'));
w('nextjs/ujg-colors.css', cssBody);
w('nextjs/ujgColors.ts', tokens(
  'UJG Color System — Next.js (App Router or Pages).\n' +
  "Copy both files into your project. Import the CSS once from app/layout.tsx (or\n" +
  '_app.tsx). This module is plain data with no side effects — no "use client" needed,\n' +
  'so it is safe in Server Components too.'));
w('expo/ujgColors.ts', tokens(
  'UJG Color System — Expo / React Native.\n' +
  'Copy this file into your project. React Native has no CSS custom properties, so\n' +
  'there is no stylesheet here — use these values directly in StyleSheet.create().\n' +
  'The `css` field on gradients is web-only; feed `colors` and `angle` to\n' +
  'expo-linear-gradient instead.'));
w('expo/theme.ts', expoTheme());
