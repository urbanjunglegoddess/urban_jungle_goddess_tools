# Focus Window — Toolkit

Four focus tools, one shared brain, four stacks. Colour comes from the UJG Color System.

## The four tools (the ladder)

| # | Tool | What it does |
|---|------|--------------|
| 1 | **Fit** | Window in → breakdown of every session style at once. A calculator. |
| 2 | **Planner** | Window + one style + your blocks → a static timed plan. |
| 3 | **Combined** | The compare grid becomes the dial: tap a style, it feeds the plan. |
| 4 | **Live** | Combined + **Start**: locks to the clock, live now-line, hand-off chime. |

Tool 4 is the superset; 1–3 are smaller shells over the same core.

## The architecture

```
shared/focusCore.ts     ← all the math. pure functions, no DOM, no framework.
html/                   ← 4 standalone single-file tools (open in any browser)
  1-fit.html  2-planner.html  3-combined.html  4-live.html
web/                    ← the split build: markup, styles, logic as three files
  focus-window.html  focus-window.css  focus-window.js
react/
  lib/focusCore.ts      ← copy of the core
  components/           FocusWindow.tsx + the four named wrappers
  App.example.tsx
nextjs/
  lib/focusCore.ts      ← copy of the core
  components/           FocusWindow.tsx + the four named wrappers
  app/page.example.tsx
expo/
  lib/focusCore.ts      ← copy of the core
  theme.ts
  components/           FocusWindow.tsx + the four named wrappers
  App.example.tsx
scripts/verify-palette.mjs
```

Only the **shell** differs across stacks — storage, styling, timers, sound. The logic is
identical because it all comes from `focusCore.ts` (verified byte-identical in all four
copies). Fix a bug once, fix it everywhere.

## HTML — zero setup
Open any file in `html/` in a browser. Self-contained: styles, logic, WebAudio chime, and
localStorage persistence all inline. Host them or drop into a Wix/Melanaxis embed as-is.

## Web — the split build
`web/` is the same tool as `html/4-live.html`, broken into three files so you can edit
styles without touching markup. `focus-window.html` links the other two; drop all three in
one directory. It's the only build that loads **Fraunces** from Google Fonts.

## React (Vite / CRA / any bundler)
Copy `react/lib/focusCore.ts` and `react/components/*`. Mount:
```tsx
import LiveFocusWindow from "./components/LiveFocusWindow";
```
No dependencies. Styles ship inside the component as a plain `<style>` element.
One caveat: unlike the Next.js build, those styles are **not scoped** — styled-jsx is a
Next feature. The class names are generic (`.card`, `.chip`, `.row`), so if they collide
with your app, mount the tool in its own route or move the CSS to a CSS Module.

## Next.js (App Router, React 18+)
1. Copy `nextjs/lib/focusCore.ts` and `nextjs/components/*` into your app.
2. Render a tool:
   ```tsx
   import LiveFocusWindow from "@/components/LiveFocusWindow";
   export default function Page() { return <LiveFocusWindow />; }
   ```
3. All components are `"use client"`. Styling is built-in styled-jsx — no Tailwind or CSS
   files required. Fraunces is referenced for display type; add it via `next/font` or a
   `<link>` if you want it, otherwise it falls back to a serif.
No extra dependencies.

## Expo (React Native)
Install the two shells the core doesn't cover:
```bash
npx expo install @react-native-async-storage/async-storage expo-haptics
```
Then copy `expo/lib/focusCore.ts`, `expo/theme.ts`, and `expo/components/*`. Mount:
```tsx
import LiveFocusWindow from "./components/LiveFocusWindow";
```
Notes:
- Persistence uses AsyncStorage. The "held" state is real on device.
- The hand-off signal is a **haptic pulse** (asset-free). For an audible chime, add
  `expo-av` and play a bundled tone in `chime()` — the hook is already there.
- Time entry is a hand-rolled hour/minute/AM-PM control (RN has no `<input type=time>`).
  Swap in `@react-native-community/datetimepicker` if you'd rather use the native wheel.

## One knob to know: `variant`
Every framework exposes the same four via `<FocusWindow variant="fit|planner|combined|live" />`.
The named files (`FitCalculator`, etc.) are one-line wrappers around that — use whichever
import reads cleaner in your codebase.

## Colour

The palette is the **UJG Color System** — see `colors/ujg-color-system`. Of the 16 colours
in this toolkit, **11 are system colours** and **5 are derived surface/text steps**, because
the sheet has no tint ramps and a dark UI needs intermediate surfaces. Every derivation is
a stated mix, not an eyeballed value.

| token | value | origin |
|---|---|---|
| `--bg` | `#0A0A0A` | Night |
| `--bg2` | `#071E15` | derived · Night → Midnight Forest 55% |
| `--panel` | `#042F1E` | Midnight Forest |
| `--panel2` | `#073D26` | derived · Midnight Forest → Rich Forest 30% |
| `--line` | `#0D5E39` | Rich Forest |
| `--gold` | `#F2B01E` | Luminous Gold |
| `--gold-deep` / `--break` | `#E1A443` | Harvest Gold |
| `--cream` | `#F7DFC0` | Warm Sand |
| `--sage` | `#A8A5A0` | Muted Platinum |
| `--sage-dim` | `#90958A` | derived · Muted Platinum → Sage 30% |
| `--work` | `#2E6B4F` | Rich Jungle Green |
| `--work-lo` | `#0D5E39` | Rich Forest |
| `--spare` | `#587156` | Sage |
| `--clay` | `#E28D1F` | Marigold |
| ink on gold | `#0A0A0A` | Night |

Three assignments were forced by measurement, not taste: Rich Forest is only 2.52:1 on
Night so `--work` is Rich Jungle Green; Clay Ember is only 3.37:1 as warning text so
`--clay` is Marigold; Sage is only 2.73:1 as secondary text so `--sage` is Muted Platinum.

`web/focus-window.css` declares its tokens as `var(--ujg-*, <fallback>)`. Load
`colors/ujg-color-system/web/ujg-colors.css` before it and the system drives the tool;
without it the fallbacks keep it working standalone.

```bash
node scripts/verify-palette.mjs .
```
Checks that every colour traces to a system value or a documented derivation, and runs the
contrast table. Current state: **0 untraced, 0 contrast failures of 15 pairs.** The retheme
fixed two pre-existing AA failures (tertiary text 4.16 → 4.79, placeholder 4.39 → 5.68) and
lifted the spare timeline segment from 1.95 to 3.69.

### One limit worth knowing
The three timeline fills (`--work`, `--break`, `--spare`) are **not** mutually 3:1. They
can't be: three opaque fills each 3:1 apart *and* 3:1 above a near-black ground needs
luminances near 0.10 / 0.35 / 1.2, and the last is brighter than white. No palette
satisfies it, and the previous palette didn't either (work/break was 2.39, work/spare
1.87). The 45° hatch on `--spare` and the labelled legend carry the distinction — both
predate this change. If you extend the timeline, give any new segment a pattern too.

## Verified logic (in focusCore)
- Sessions run back to back, break between each; trailing break dropped unless `restLast`.
- `compute()` — max sessions that fit T minutes: `floor((T + brk) / (work + brk))`.
- `usable()` — window minus buffer, with `expired` / `valid` flags for the shell.
- `buildSegments()` — the timed skeleton with blocks dropped in order.
