# UJG Color System — Toolkit

The colour layer of the design system, as drop-in files for four stacks. One source of
truth, four shells. Nothing else — no type, no spacing, no components. Drop these
alongside your other style files; they don't collide with them.

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
ujg-colors.json          ← canonical data. everything, one file, framework-free.
web/
  ujg-colors.css         ← :root custom properties. no build step, no framework.
react/
  ujg-colors.css         ← same file
  ujgColors.ts           ← typed tokens
nextjs/
  ujg-colors.css         ← same file
  ujgColors.ts           ← typed tokens
expo/
  ujgColors.ts           ← typed tokens (no CSS — RN has no custom properties)
  theme.ts               ← flat palette for StyleSheet, matching the repo's theme.ts shape
scripts/
  extract.mjs            ← HTML  → ujg-colors.json
  generate.mjs           ← JSON  → every file above
  verify-fidelity.mjs    ← proves the output contains nothing the HTML doesn't
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
node scripts/verify-fidelity.mjs ../ujg_color_system_v2_1.html .
node scripts/check-collisions.mjs .
```

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
