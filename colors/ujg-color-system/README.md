# UJG Color System — Toolkit

The colour layer of the design system, as drop-in files for four stacks. One source of
truth, four shells. Drop these alongside your other style files; they don't collide with
them.

Two layers ship here:

- **Palette layer** (`ujg-colors.*`) — the brand identity. Exact hexes, verbatim from the
  reference sheet: 6 core + 2 functional + 7 extended colours across ten value systems,
  plus 20 each of schemes, gradients, moods, and themed palettes. Nothing computed.
- **System layer** (`ujg-system.*`, `ujg.tokens.json`) — the working UI system *derived*
  from the palette: tonal ramps, semantic role tokens (dark + light), and a WCAG contrast
  matrix. This is what you actually build product UI against. It never changes a brand hex.

If you only want swatches, take the palette layer. If you're building an app, a site, or
anything with buttons and text, you want the system layer on top of it.

**Source of truth:** [`../ujg_color_system_v2_1.html`](../ujg_color_system_v2_1.html).
Every value here is reproduced **verbatim** from that sheet. Nothing was converted,
rounded, renamed, or corrected.

## What's in it

| Group | Count | What it is |
|---|---|---|
| Core palette | 6 | Night, Deep Amethyst, Sunset Ember, Luminous Gold, Rich Forest, Platinum — each across 10 value systems |
| Functional support | 2 | Muted Platinum (secondary text), Rich Jungle Green (success) |
| Extended palette | 7 | Earth tones for the Amazonia register — Midnight Forest, Clay Ember, Harvest Gold, Sage, Marigold, Warm Sand, Terracotta |
| Functional mapping | 11 | Semantic role → colour |
| Colour schemes | 20 | Three-colour trios |
| Gradients | 20 | Three-stop linear gradients |
| Mood palettes | 20 | Four seasons plus sixteen registers |
| Tech + Earth gradients | 20 | Core crossed with the earth set |
| Tech + Earth schemes | 20 | Trios pairing core with earth |
| Themed palettes | 20 | Multi-colour sets tuned to the suites and personas |

All ten value systems travel with each core and extended colour — HEX, RGB, HSB,
HUE *or* HSL, CMYK, LAB, RAL, Copic, HKS, Prismacolor — so the print values are in the
token file, not just the screen ones.

## The architecture

```
ujg-colors.json          ← canonical palette data. everything, one file, framework-free.
ujg-system.json          ← canonical system data: ramps + semantics + contrast.
ujg.tokens.json          ← W3C DTCG tokens (primitives + semantic aliases). Figma / Style Dictionary.
contrast-report.html     ← the WCAG pass/fail matrix, rendered. open it in a browser.
web/
  ujg-colors.css         ← palette :root custom properties. no build step, no framework.
  ujg-system.css         ← ramps + semantic tokens (:root dark, [data-theme=light]).
react/
  ujg-colors.css         ← same palette file
  ujgColors.ts           ← typed palette tokens
  ujg-system.css         ← same system file
  ujgSystem.ts           ← typed ramps + semantics + contrast
nextjs/
  ujg-colors.css         ← same palette file
  ujgColors.ts           ← typed palette tokens
  ujg-system.css         ← same system file
  ujgSystem.ts           ← typed ramps + semantics + contrast
expo/
  ujgColors.ts           ← typed palette tokens (no CSS — RN has no custom properties)
  theme.ts               ← flat palette for StyleSheet
  ujgSystem.ts           ← ramps + semantics + contrast (use ujgSemantic[mode] directly)
scripts/
  extract.mjs            ← HTML  → ujg-colors.json
  generate.mjs           ← ujg-colors.json → every palette file above
  generate-system.mjs    ← ujg-colors.json → every system file above (ramps, semantics, contrast)
  verify-fidelity.mjs    ← proves the palette output contains nothing the HTML doesn't
  check-collisions.mjs   ← proves no token silently shadows another
```

The CSS is byte-identical across `web/`, `react/`, and `nextjs/`, and the three
`ujgColors.ts` files differ only in their header comment. That duplication is on
purpose — each folder is a self-contained thing you copy, the same way
`focusCore.ts` is copied into each stack in the focus-window toolkit.

## Web — zero setup

Copy `web/ujg-colors.css` and link it before your own stylesheets.

```html
<link rel="stylesheet" href="ujg-colors.css">
```

```css
.hero      { background: var(--ujg-night); color: var(--ujg-platinum); }
.hero-cta  { background: var(--ujg-role-cta-action); }
.hero-band { background: var(--ujg-gradient-quantum-royalty); }
```

Scheme classes set numbered slots you read positionally:

```html
<div class="ujg-trio-afro-futurist-royal">
  <!-- --ujg-scheme-1, -2, -3 are now Amethyst, Gold, Night -->
</div>
```

## React (Vite / CRA / any bundler)

Copy `react/ujg-colors.css` and `react/ujgColors.ts`. Import the CSS once at the root.

```tsx
import './ujg-colors.css';
import { ujgColors, ujgRoles, ujgGradients } from './ujgColors';

<button style={{ background: ujgRoles.ctaAction, color: ujgColors.night }}>Enroll</button>
```

## Next.js (App Router or Pages)

Copy `nextjs/ujg-colors.css` and `nextjs/ujgColors.ts`. Import the CSS once from
`app/layout.tsx` (or `pages/_app.tsx`).

```tsx
import './ujg-colors.css';
```

`ujgColors.ts` is plain data with no side effects — no `"use client"` needed, so it
imports cleanly into Server Components as well as client ones.

## Expo / React Native

Copy `expo/ujgColors.ts` and `expo/theme.ts`. React Native has no CSS custom
properties, so there is no stylesheet — use the values directly.

```tsx
import { T } from './theme';

const s = StyleSheet.create({
  screen: { backgroundColor: T.night },
  cta:    { backgroundColor: T.ctaAction },
});
```

For gradients, install `expo-linear-gradient` and feed it `colors` — the `css` field on
each gradient is web-only and will do nothing here.

```tsx
import { ujgGradients } from './ujgColors';
const g = ujgGradients.find((x) => x.slug === 'quantum-royalty')!;
<LinearGradient colors={[...g.colors]} start={{x:0,y:0}} end={{x:1,y:1}} />
```

## Naming

- CSS colour: `--ujg-<slug>` → `--ujg-deep-amethyst`
- CSS role: `--ujg-role-<slug>` → `--ujg-role-cta-action`
- CSS gradient: `--ujg-gradient-<slug>` → `--ujg-gradient-quantum-royalty`
- CSS scheme class: `.ujg-trio-*`, `.ujg-mood-*`, `.ujg-palette-*`, each setting `--ujg-scheme-1..n`
- TS colour key: camelCase → `ujgColors.deepAmethyst`, `ujgRoles.ctaAction`

Slugs are derived from the display names in the sheet, so `Deep Amethyst` is always
`deep-amethyst` / `deepAmethyst` wherever it appears.

## Regenerating

The HTML is the source of truth. When it changes, re-run the chain rather than editing
the generated files — they all carry a `do not hand-edit` header for that reason.

```bash
node scripts/extract.mjs ../ujg_color_system_v2_1.html ujg-colors.json
node scripts/generate.mjs ujg-colors.json .
node scripts/generate-system.mjs ujg-colors.json .
node scripts/verify-fidelity.mjs ../ujg_color_system_v2_1.html .
node scripts/check-collisions.mjs .
```

The palette layer is verbatim from the HTML; the system layer is computed from the palette
JSON. So the HTML remains the one source of truth — everything downstream rebuilds from it.

No dependencies — plain Node, no install.

## Verified

- **1166 fidelity checks, 0 failures.** Every colour name, role, swatch, value string
  (all ten systems × fifteen colours), mapping row, scheme name, description, gradient
  CSS string, and front-matter block was confirmed present in the source HTML.
- **0 stray hexes.** No generated file contains a hex the source doesn't.
- **0 collisions.** 66 `:root` properties and 80 class selectors, all unique; the two
  shared namespaces (`--ujg-gradient-*` across both gradient sections, `.ujg-trio-*`
  across both trio sections) were checked for overlap and have none.
- **`tsc --strict` clean** on all four TypeScript files.
- Counts match the sheet exactly: 6 / 2 / 7 / 11 / 20 / 20 / 20 / 20 / 20 / 20.

## The system layer

The palette gives you named brand colours. The system layer gives you the three things a
palette needs before it's a design system: **tonal ramps**, **semantic tokens**, and a
**contrast matrix**. All of it is computed from the same `ujg-colors.json`, so it can never
drift from the brand — re-run one script and it rebuilds.

### Tonal ramps

Each of the 6 core, 2 functional, and 7 extended colours gets an 11-step ramp
(`50 → 950`), spaced evenly in OKLCH so the steps look perceptually even, not
mathematically even. Chroma eases off at the light and dark ends so you never get a neon
pastel or a muddy near-black. The brand hex stays the identity anchor; the ramp is the
working set you pull hover states, tints, borders, and backgrounds from.

```css
background: var(--ujg-deep-amethyst-100);   /* a soft amethyst wash */
border-color: var(--ujg-deep-amethyst-300);
color: var(--ujg-deep-amethyst-700);
```

```ts
import { ujgScales } from './ujgSystem';
ujgScales.deepAmethyst[500]; // "#7B3FBF"
```

### Semantic tokens

43 role tokens — surfaces, text, borders, primary/secondary actions, CTA, accent, and the
four feedback families (success / warning / error / info) — each defined for **dark**
(the default; the brand lives on Night) and **light**. Build product UI against these, not
against raw colours: when the brand shifts, the roles re-point and nothing downstream
changes. This is the fix for colour drift across files.

```css
/* dark is default; add data-theme="light" on <html> to switch */
.card   { background: var(--ujg-surface-raised); color: var(--ujg-text-default); }
.card p { color: var(--ujg-text-muted); }
.btn    { background: var(--ujg-action-primary-bg); color: var(--ujg-action-primary-fg); }
.btn:hover { background: var(--ujg-action-primary-hover); }
.badge-error { background: var(--ujg-error-bg); color: var(--ujg-error-fg); border:1px solid var(--ujg-error-border); }
```

```ts
import { ujgSemantic } from './ujgSystem';
const t = ujgSemantic.dark;            // or .light
<View style={{ backgroundColor: t.surfaceBase }}>
  <Text style={{ color: t.textDefault }}>…</Text>
</View>
```

### Contrast matrix

Every semantic pairing is checked against WCAG 2.1 and every combination in the system
passes **AA** in both modes — it's enforced, not annotated. Open `contrast-report.html` to
see the full table with live `Aa` previews and AA/AAA pass marks, or read
`ujgContrast[mode]` in code. The brand-pairs table at the bottom is the one to memorise:

- **Deep Amethyst, Rich Forest** on Night → decorative only. They're fills and shapes,
  never text on black. Use the light ramp steps (`-300`) or Platinum for text.
- **Luminous Gold, Platinum, Muted Platinum** on Night → safe for text.
- **Sunset Ember** on Night → 4.90:1, safe for text; on Platinum, large text only.

### Regenerating the system layer

```bash
node scripts/generate-system.mjs ujg-colors.json .
```

Plain Node, no install. It rebuilds every `ujg-system.*` file, `ujg.tokens.json`, and
`contrast-report.html`, and prints a summary that fails loudly if any pairing drops below
AA. The generated files carry a `do not hand-edit` header for the same reason the palette
files do — change the ramp curve or a semantic mapping in the script, not in the output.

## One thing to know before print

These files reproduce the sheet faithfully, including three inconsistencies that are in
the source. They were **not** fixed here, because the brief was an exact copy — but they
will bite a print run, so they're worth knowing:

1. **CMYK uses two different models.** The six core and two functional colours are naive
   device conversions. All seven extended colours are not — Terracotta is listed as
   `22, 84, 100, 13`, where a naive conversion of `#B04720` gives `0, 60, 82, 31`. The
   sheet's own footnote says CMYK is "an uncoated naive conversion," which holds for 8 of
   the 15 colours.
2. **LAB uses two different white points.** Core and functional are D65. All seven
   extended are D50. Neither is labelled, and LAB without a stated illuminant is
   ambiguous.
3. **Clay Ember's HSL lightness is `54`**; `#C15C27` computes to `45`.

Everything else checked out — all eight core and functional colours are exact across
HSB, naive CMYK, and LAB D65. Say the word and I'll produce a corrected variant
alongside these, so the verbatim copy stays intact.
