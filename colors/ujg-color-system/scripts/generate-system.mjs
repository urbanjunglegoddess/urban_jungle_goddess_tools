// Generates the UJG SYSTEM LAYER from ujg-colors.json.
//
// The palette layer (ujg-colors.*) is the brand identity: exact hexes, verbatim
// from the reference sheet. This layer is the WORKING UI SYSTEM derived from it —
// tonal ramps, semantic role tokens (dark + light), and a WCAG contrast matrix.
// Nothing here changes a brand hex; it only computes the scaffolding a real design
// system needs on top of the palette. Plain Node, no dependencies.
//
//   node scripts/generate-system.mjs ujg-colors.json .
//
import fs from 'node:fs';
import path from 'node:path';

const DATA = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ROOT = process.argv[3];
const SRC = DATA.meta.source;

const w = (rel, body) => {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body.replace(/\n*$/, '\n'), 'utf8');
  console.log('  ' + rel.padEnd(30) + fs.statSync(p).size + ' B');
};
const j = (v) => JSON.stringify(v);

// ============================================================ color math =====
// sRGB <-> linear
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}
function rgbToHex([r, g, b]) {
  const c = (x) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, '0');
  return ('#' + c(r) + c(g) + c(b)).toUpperCase();
}

// sRGB -> OKLab -> OKLCH
function srgbToOklab([r, g, b]) {
  r = toLin(r); g = toLin(g); b = toLin(b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}
function oklabToSrgb([L, a, b]) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}
const oklabToOklch = ([L, a, b]) => [L, Math.hypot(a, b), Math.atan2(b, a)];
const oklchToOklab = ([L, C, h]) => [L, C * Math.cos(h), C * Math.sin(h)];

function inGamut([r, g, b]) {
  const e = 1e-4;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}
// Convert an OKLCH triple to the nearest in-gamut sRGB hex by reducing chroma.
function oklchToHex([L, C, h]) {
  let c = C;
  for (let i = 0; i < 40; i++) {
    const rgb = oklabToSrgb(oklchToOklab([L, c, h]));
    if (inGamut(rgb)) return rgbToHex(rgb);
    c *= 0.94;
  }
  return rgbToHex(oklabToSrgb(oklchToOklab([L, 0, h])));
}

// WCAG 2.1 relative luminance + contrast ratio
function luminance([r, g, b]) {
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
function contrast(hexA, hexB) {
  const a = luminance(hexToRgb(hexA)) + 0.05;
  const b = luminance(hexToRgb(hexB)) + 0.05;
  return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100;
}

// ============================================================ tonal ramps ====
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Perceptual lightness (OKLCH L) targets, even-ish across the range.
const L_TARGET = [0.972, 0.938, 0.878, 0.802, 0.716, 0.628, 0.542, 0.458, 0.372, 0.284, 0.205];
// Chroma multiplier per step: muted at the light end (no neon pastels), full through
// the mids, easing off at the dark end (no muddy black-purple).
const C_MULT = [0.30, 0.45, 0.62, 0.80, 0.92, 1.0, 1.0, 0.96, 0.86, 0.72, 0.58];

// Which colours get a ramp: the 6 core, the 2 functional (Rich Jungle Green feeds
// the success tokens, Muted Platinum the neutrals), and the 7 extended earth tones.
const RAMP_SOURCES = [...DATA.core, ...DATA.functional, ...DATA.extended];

function buildRamp(hex) {
  const [, C, h] = oklabToOklch(srgbToOklab(hexToRgb(hex)));
  const out = {};
  STEPS.forEach((step, i) => {
    out[step] = oklchToHex([L_TARGET[i], C * C_MULT[i], h]);
  });
  return out;
}

const scales = {};        // slug -> { 50: hex, ... }
const scaleMeta = [];     // [{ name, slug, key, base, baseStep, steps }]
for (const c of RAMP_SOURCES) {
  const ramp = buildRamp(c.swatch);
  scales[c.slug] = ramp;
  // Which step sits closest to the brand hex (for reference).
  const baseL = srgbToOklab(hexToRgb(c.swatch))[0];
  let baseStep = 500, best = Infinity;
  STEPS.forEach((s, i) => {
    const d = Math.abs(L_TARGET[i] - baseL);
    if (d < best) { best = d; baseStep = s; }
  });
  scaleMeta.push({ name: c.name, slug: c.slug, key: c.key, base: c.swatch, baseStep });
}
const S = (slug, step) => scales[slug][step];
// Raw brand hex by slug (identity anchors — used where brand colour must be exact).
const RAW = Object.fromEntries([...DATA.core, ...DATA.functional, ...DATA.extended].map((c) => [c.slug, c.swatch]));

// ============================================================ semantics ======
// Two modes. Dark is the default — the brand lives on Night. Each token names a
// role, not a colour, and resolves to a ramp step or a brand hex. onX tokens are
// the legible foreground for the matching surface/action.
const semantic = {
  dark: {
    // surfaces
    'surface-base':        RAW.night,
    'surface-raised':      S('night', 900),
    'surface-sunken':      '#000000',
    'surface-overlay':     S('night', 800),
    'surface-inverse':     RAW.platinum,
    // text
    'text-default':        RAW.platinum,
    'text-muted':          RAW['muted-platinum'],
    'text-subtle':         S('night', 400),
    'text-inverse':        RAW.night,
    'text-link':           S('luminous-gold', 400),
    'text-link-hover':     S('luminous-gold', 300),
    // borders
    'border-subtle':       S('night', 800),
    'border-default':      S('night', 700),
    'border-strong':       S('night', 500),
    'border-focus':        S('deep-amethyst', 400),
    'focus-ring':          S('deep-amethyst', 400),
    // primary action (Amethyst)
    'action-primary-bg':        RAW['deep-amethyst'],
    'action-primary-hover':     S('deep-amethyst', 600),
    'action-primary-active':    S('deep-amethyst', 800),
    'action-primary-disabled':  S('deep-amethyst', 900),
    'action-primary-fg':        RAW.platinum,
    // secondary action (outline on surface)
    'action-secondary-bg':      S('night', 900),
    'action-secondary-hover':   S('night', 800),
    'action-secondary-border':  S('night', 600),
    'action-secondary-fg':      RAW.platinum,
    // CTA (Sunset Ember) + accent (Gold)
    'cta-bg':              RAW['sunset-ember'],
    'cta-hover':           S('sunset-ember', 600),
    'cta-fg':              RAW.night,
    'accent':              RAW['luminous-gold'],
    'accent-hover':        S('luminous-gold', 400),
    'accent-fg':           RAW.night,
    // feedback: fg is legible on dark; bg is a deep tint; border is mid
    'success-fg':          S('rich-jungle-green', 300),
    'success-bg':          S('rich-jungle-green', 900),
    'success-border':      S('rich-jungle-green', 700),
    'warning-fg':          S('luminous-gold', 300),
    'warning-bg':          S('luminous-gold', 900),
    'warning-border':      S('luminous-gold', 700),
    'error-fg':            S('sunset-ember', 300),
    'error-bg':            S('sunset-ember', 900),
    'error-border':        S('sunset-ember', 700),
    'info-fg':             S('deep-amethyst', 300),
    'info-bg':             S('deep-amethyst', 900),
    'info-border':         S('deep-amethyst', 700),
  },
  light: {
    'surface-base':        S('platinum', 50),
    'surface-raised':      '#FFFFFF',
    'surface-sunken':      S('platinum', 100),
    'surface-overlay':     '#FFFFFF',
    'surface-inverse':     RAW.night,
    'text-default':        RAW.night,
    'text-muted':          S('night', 600),
    'text-subtle':         S('night', 500),
    'text-inverse':        RAW.platinum,
    'text-link':           S('deep-amethyst', 600),
    'text-link-hover':     S('deep-amethyst', 800),
    'border-subtle':       S('platinum', 200),
    'border-default':      S('platinum', 300),
    'border-strong':       S('muted-platinum', 600),
    'border-focus':        S('deep-amethyst', 500),
    'focus-ring':          S('deep-amethyst', 500),
    'action-primary-bg':        RAW['deep-amethyst'],
    'action-primary-hover':     S('deep-amethyst', 800),
    'action-primary-active':    S('deep-amethyst', 900),
    'action-primary-disabled':  S('deep-amethyst', 200),
    'action-primary-fg':        RAW.platinum,
    'action-secondary-bg':      '#FFFFFF',
    'action-secondary-hover':   S('platinum', 100),
    'action-secondary-border':  S('platinum', 400),
    'action-secondary-fg':      RAW.night,
    'cta-bg':              RAW['sunset-ember'],
    'cta-hover':           S('sunset-ember', 700),
    'cta-fg':              RAW.night,
    'accent':              RAW['luminous-gold'],
    'accent-hover':        S('luminous-gold', 700),
    'accent-fg':           RAW.night,
    'success-fg':          S('rich-jungle-green', 700),
    'success-bg':          S('rich-jungle-green', 50),
    'success-border':      S('rich-jungle-green', 300),
    'warning-fg':          S('luminous-gold', 800),
    'warning-bg':          S('luminous-gold', 50),
    'warning-border':      S('luminous-gold', 300),
    'error-fg':            S('sunset-ember', 700),
    'error-bg':            S('sunset-ember', 50),
    'error-border':        S('sunset-ember', 300),
    'info-fg':             S('deep-amethyst', 700),
    'info-bg':             S('deep-amethyst', 50),
    'info-border':         S('deep-amethyst', 300),
  },
};
const SEM_KEYS = Object.keys(semantic.dark);
const camelToken = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// ============================================================ contrast =======
// Pairs that must be legible. label, fg, bg, and the smallest text size the pair
// is meant for ('normal' needs AA 4.5 / AAA 7; 'large' needs AA 3 / AAA 4.5).
function pairs(mode) {
  const m = semantic[mode];
  return [
    ['Body text on base surface',        m['text-default'], m['surface-base'], 'normal'],
    ['Body text on raised surface',      m['text-default'], m['surface-raised'], 'normal'],
    ['Muted text on base surface',       m['text-muted'],   m['surface-base'], 'normal'],
    ['Subtle text on base surface',      m['text-subtle'],  m['surface-base'], 'large'],
    ['Link on base surface',             m['text-link'],    m['surface-base'], 'normal'],
    ['Primary button label',             m['action-primary-fg'], m['action-primary-bg'], 'normal'],
    ['Secondary button label',           m['action-secondary-fg'], m['action-secondary-bg'], 'normal'],
    ['CTA label',                        m['cta-fg'],       m['cta-bg'], 'normal'],
    ['Accent label',                     m['accent-fg'],    m['accent'], 'normal'],
    ['Success text on success surface',  m['success-fg'],   m['success-bg'], 'normal'],
    ['Warning text on warning surface',  m['warning-fg'],   m['warning-bg'], 'normal'],
    ['Error text on error surface',      m['error-fg'],     m['error-bg'], 'normal'],
    ['Info text on info surface',        m['info-fg'],      m['info-bg'], 'normal'],
    ['Focus ring on base surface',       m['focus-ring'],   m['surface-base'], 'large'],
    ['Strong border on base surface',    m['border-strong'], m['surface-base'], 'large'],
  ];
}
function grade(ratio, size) {
  const aa = size === 'large' ? 3 : 4.5;
  const aaa = size === 'large' ? 4.5 : 7;
  return { aa: ratio >= aa, aaa: ratio >= aaa };
}
const contrastMatrix = {};
for (const mode of ['dark', 'light']) {
  contrastMatrix[mode] = pairs(mode).map(([label, fg, bg, size]) => {
    const ratio = contrast(fg, bg);
    const g = grade(ratio, size);
    return { label, fg, bg, size, ratio, aa: g.aa, aaa: g.aaa };
  });
}
// Brand-pair reference (identity hexes against Night and Platinum).
const brandPairs = [];
for (const c of DATA.core.concat(DATA.functional)) {
  if (c.slug === 'night') continue;
  brandPairs.push({ label: `${c.name} on Night`, fg: c.swatch, bg: RAW.night, ratio: contrast(c.swatch, RAW.night) });
  brandPairs.push({ label: `${c.name} on Platinum`, fg: c.swatch, bg: RAW.platinum, ratio: contrast(c.swatch, RAW.platinum) });
}

// ============================================================ emit: json =====
const systemJson = {
  meta: {
    source: SRC,
    layer: 'system',
    note: 'Derived working-UI layer computed from ujg-colors.json — tonal ramps (OKLCH), semantic role tokens (dark + light), and a WCAG 2.1 contrast matrix. Brand hexes are never altered here. Do not hand-edit; re-run scripts/generate-system.mjs.',
    steps: STEPS,
    lTargets: L_TARGET,
    chromaMultipliers: C_MULT,
  },
  scales: scaleMeta.map((m) => ({ ...m, steps: scales[m.slug] })),
  semantic,
  contrast: { matrix: contrastMatrix, brandPairs, thresholds: { aaNormal: 4.5, aaLarge: 3, aaaNormal: 7, aaaLarge: 4.5 } },
};

// ============================================================ emit: DTCG =====
// W3C Design Tokens Community Group format. Primitives carry brand + ramp hexes;
// semantic tokens are aliases that reference primitives with {ujg.color...} paths.
function dtcg() {
  const color = {};
  // brand primitives
  const brand = {};
  for (const c of [...DATA.core, ...DATA.functional, ...DATA.extended]) {
    brand[c.slug] = { $value: c.swatch, $type: 'color', $description: `${c.name} — ${c.role}` };
  }
  // ramp primitives
  const ramp = {};
  for (const m of scaleMeta) {
    ramp[m.slug] = {};
    for (const step of STEPS) ramp[m.slug][step] = { $value: scales[m.slug][step], $type: 'color' };
  }
  color.brand = brand;
  color.scale = ramp;
  // semantic aliases — find the primitive path for a resolved hex
  const pathFor = (hex) => {
    for (const m of scaleMeta) for (const step of STEPS) if (scales[m.slug][step] === hex) return `{color.scale.${m.slug}.${step}}`;
    for (const c of [...DATA.core, ...DATA.functional, ...DATA.extended]) if (c.swatch === hex) return `{color.brand.${c.slug}}`;
    return hex; // literals like #000000 / #FFFFFF stay raw
  };
  const sem = { dark: {}, light: {} };
  for (const mode of ['dark', 'light'])
    for (const k of SEM_KEYS) sem[mode][k] = { $value: pathFor(semantic[mode][k]), $type: 'color' };
  color.semantic = sem;
  return { $description: `UJG Color System — W3C DTCG tokens generated from ${SRC}. Brand + tonal scales as primitives, semantic roles as aliases.`, color };
}

// ============================================================ emit: css ======
function systemCss() {
  const L = [];
  L.push('/*');
  L.push(' * UJG Color System — SYSTEM LAYER (tonal scales + semantic tokens)');
  L.push(` * Generated from ${SRC} via generate-system.mjs. Do not hand-edit.`);
  L.push(' *');
  L.push(' * Load AFTER ujg-colors.css. Scales and semantics are derived from the brand');
  L.push(' * palette; the brand hexes themselves live in ujg-colors.css and are unchanged.');
  L.push(' * Default is dark (the brand lives on Night). Add data-theme="light" on <html>');
  L.push(' * to switch. Reference semantics, not raw colours, in product UI.');
  L.push(' */');
  L.push('');
  L.push(':root {');
  L.push('  /* --- Tonal scales (OKLCH-even, brand-tinted) --------------------- */');
  for (const m of scaleMeta) {
    L.push(`  /* ${m.name} — brand hex sits nearest step ${m.baseStep} */`);
    for (const step of STEPS) L.push(`  --ujg-${m.slug}-${step}: ${scales[m.slug][step]};`);
  }
  L.push('');
  L.push('  /* --- Semantic tokens · DARK (default) ---------------------------- */');
  for (const k of SEM_KEYS) L.push(`  --ujg-${k}: ${semantic.dark[k]};`);
  L.push('}');
  L.push('');
  L.push('/* --- Semantic tokens · LIGHT ------------------------------------- */');
  L.push('[data-theme="light"] {');
  for (const k of SEM_KEYS) L.push(`  --ujg-${k}: ${semantic.light[k]};`);
  L.push('}');
  return L.join('\n');
}

// ============================================================ emit: ts =======
function systemTs(header) {
  const L = [];
  L.push('/**');
  header.split('\n').forEach((l) => L.push(' * ' + l));
  L.push(' *');
  L.push(` * Generated from ${SRC} via generate-system.mjs. Do not hand-edit.`);
  L.push(' */');
  L.push('');
  L.push('export type UjgStep = ' + STEPS.join(' | ') + ';');
  L.push('export type UjgScaleName =');
  L.push('  ' + scaleMeta.map((m) => j(m.key)).join(' | ') + ';');
  L.push('');
  L.push('/** Tonal ramps, brand-tinted and perceptually even (OKLCH). */');
  L.push('export const ujgScales = {');
  for (const m of scaleMeta) {
    L.push(`  ${m.key}: { ${STEPS.map((s) => `${s}: ${j(scales[m.slug][s])}`).join(', ')} },`);
  }
  L.push('} as const satisfies Record<UjgScaleName, Record<UjgStep, string>>;');
  L.push('');
  L.push('export type UjgSemanticToken =');
  L.push('  ' + SEM_KEYS.map((k) => j(camelToken(k))).join(' |\n  ') + ';');
  L.push('');
  L.push('/** Semantic role tokens for both modes. Reference these in product UI. */');
  L.push('export const ujgSemantic = {');
  for (const mode of ['dark', 'light']) {
    L.push(`  ${mode}: {`);
    for (const k of SEM_KEYS) L.push(`    ${camelToken(k)}: ${j(semantic[mode][k])},`);
    L.push('  },');
  }
  L.push('} as const;');
  L.push('');
  L.push('export type UjgMode = keyof typeof ujgSemantic;');
  L.push('');
  L.push('/** WCAG 2.1 contrast checks for the key pairings, per mode. */');
  L.push('export const ujgContrast = {');
  for (const mode of ['dark', 'light']) {
    L.push(`  ${mode}: [`);
    for (const r of contrastMatrix[mode])
      L.push(`    { label: ${j(r.label)}, fg: ${j(r.fg)}, bg: ${j(r.bg)}, size: ${j(r.size)}, ratio: ${r.ratio}, aa: ${r.aa}, aaa: ${r.aaa} },`);
    L.push('  ],');
  }
  L.push('} as const;');
  return L.join('\n');
}

// ============================================================ emit: report ===
function contrastReport() {
  const row = (r) => {
    const badge = (ok, txt) => `<span class="b ${ok ? 'pass' : 'fail'}">${txt} ${ok ? '✓' : '✗'}</span>`;
    return `<tr>
      <td>${r.label}</td>
      <td><span class="sw" style="background:${r.fg}"></span><code>${r.fg}</code></td>
      <td><span class="sw" style="background:${r.bg}"></span><code>${r.bg}</code></td>
      <td class="chip" style="background:${r.bg};color:${r.fg}">Aa</td>
      <td class="num">${r.ratio.toFixed(2)}:1</td>
      <td>${r.size}</td>
      <td>${badge(r.aa, 'AA')}</td>
      <td>${badge(r.aaa, 'AAA')}</td>
    </tr>`;
  };
  const section = (mode) => `
    <h2>${mode === 'dark' ? 'Dark mode (default)' : 'Light mode'}</h2>
    <table>
      <thead><tr><th>Pairing</th><th>Foreground</th><th>Background</th><th>Preview</th><th>Ratio</th><th>Size</th><th>AA</th><th>AAA</th></tr></thead>
      <tbody>${contrastMatrix[mode].map(row).join('')}</tbody>
    </table>`;
  const brandRow = (p) => `<tr><td>${p.label}</td><td class="chip" style="background:${p.bg};color:${p.fg}">Aa</td><td class="num">${p.ratio.toFixed(2)}:1</td><td>${p.ratio >= 4.5 ? '<span class="b pass">text ✓</span>' : p.ratio >= 3 ? '<span class="b warn">large only</span>' : '<span class="b fail">decorative</span>'}</td></tr>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>UJG Contrast Matrix</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0A0A0A;color:#E8E6E1;font:14px/1.5 'Segoe UI',system-ui,sans-serif;padding:40px 32px 64px}
  h1{font-size:24px;letter-spacing:1px;margin:0 0 4px}
  h1 span{color:#F2B01E}
  .sub{color:#9a9791;font-size:13px;margin-bottom:8px}
  h2{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#F2B01E;margin:38px 0 12px;border-bottom:1px solid #2a2a2a;padding-bottom:8px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;color:#8a877f;font-weight:600;font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid #2a2a2a}
  td{padding:9px 10px;border-bottom:1px solid #1c1c1c;vertical-align:middle}
  code{font-family:ui-monospace,monospace;font-size:11px;color:#b9b6b0}
  .sw{display:inline-block;width:13px;height:13px;border-radius:3px;vertical-align:-2px;margin-right:6px;border:1px solid #333}
  .chip{font-weight:700;text-align:center;border-radius:6px;width:44px}
  .num{font-family:ui-monospace,monospace;font-weight:600}
  .b{display:inline-block;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}
  .pass{background:rgba(46,107,79,.35);color:#5fce9b}
  .fail{background:rgba(217,83,26,.28);color:#f0895a}
  .warn{background:rgba(242,176,30,.22);color:#f2b01e}
  .legend{color:#78756f;font-size:12px;margin-top:10px}
</style></head><body>
  <h1>UJG <span>Contrast Matrix</span></h1>
  <div class="sub">WCAG 2.1 relative-luminance ratios for every semantic pairing. Computed from ${SRC}. AA needs 4.5:1 (normal) / 3:1 (large); AAA needs 7:1 / 4.5:1.</div>
  ${section('dark')}
  ${section('light')}
  <h2>Brand pairs — identity hexes on Night &amp; Platinum</h2>
  <table><thead><tr><th>Pairing</th><th>Preview</th><th>Ratio</th><th>Verdict</th></tr></thead>
  <tbody>${brandPairs.map(brandRow).join('')}</tbody></table>
  <div class="legend">Verdict on brand pairs: "text" = safe for body copy, "large only" = headings/large text ≥3:1, "decorative" = shape/icon fills only, never text.</div>
</body></html>`;
}

// ============================================================ write ==========
console.log('GENERATED SYSTEM LAYER');
w('ujg-system.json', JSON.stringify(systemJson, null, 2));
w('ujg.tokens.json', JSON.stringify(dtcg(), null, 2));
const cssBody = systemCss();
w('web/ujg-system.css', cssBody);
w('react/ujg-system.css', cssBody);
w('nextjs/ujg-system.css', cssBody);
w('react/ujgSystem.ts', systemTs('UJG Color System — SYSTEM LAYER for React.\nImport ujg-system.css once at the root (after ujg-colors.css); use these typed tokens in code.'));
w('nextjs/ujgSystem.ts', systemTs('UJG Color System — SYSTEM LAYER for Next.js.\nImport ujg-system.css from app/layout.tsx (after ujg-colors.css). Plain data, safe in Server Components.'));
w('expo/ujgSystem.ts', systemTs('UJG Color System — SYSTEM LAYER for Expo / React Native.\nNo CSS in RN — use ujgSemantic[mode] and ujgScales directly in StyleSheet.create().'));
w('contrast-report.html', contrastReport());

// summary
const fails = [];
for (const mode of ['dark', 'light'])
  for (const r of contrastMatrix[mode]) if (!r.aa) fails.push(`${mode}: ${r.label} (${r.ratio}:1, ${r.size})`);
console.log('\nSCALES        ' + scaleMeta.length + ' ramps × ' + STEPS.length + ' steps');
console.log('SEMANTIC      ' + SEM_KEYS.length + ' tokens × 2 modes');
console.log('CONTRAST      ' + (contrastMatrix.dark.length + contrastMatrix.light.length) + ' pairings checked');
console.log('AA FAILURES   ' + fails.length);
for (const f of fails) console.log('  ✗ ' + f);
