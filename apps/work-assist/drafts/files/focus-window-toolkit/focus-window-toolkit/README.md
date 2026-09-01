# Focus Window — Toolkit

Four focus tools, one shared brain, three stacks. Same Afro-Futurist palette everywhere.

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
nextjs/
  lib/focusCore.ts      ← copy of the core
  components/
    FocusWindow.tsx     ← one client component, variant-driven
    FitCalculator.tsx   Planner.tsx  CombinedPlanner.tsx  LiveFocusWindow.tsx
  app/page.example.tsx
expo/
  lib/focusCore.ts      ← copy of the core
  theme.ts
  components/
    FocusWindow.tsx     ← one RN component, variant-driven
    FitCalculator.tsx   Planner.tsx  CombinedPlanner.tsx  LiveFocusWindow.tsx
  App.example.tsx
```

Only the **shell** differs across stacks — storage, styling, timers, sound. The logic is
identical because it all comes from `focusCore.ts`. Fix a bug once, fix it everywhere.

## HTML — zero setup
Open any file in `html/` in a browser. Self-contained: styles, logic, WebAudio chime, and
localStorage persistence all inline. Host them or drop into a Wix/Melanaxis embed as-is.

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

## Verified logic (in focusCore)
- Sessions run back to back, break between each; trailing break dropped unless `restLast`.
- `compute()` — max sessions that fit T minutes: `floor((T + brk) / (work + brk))`.
- `usable()` — window minus buffer, with `expired` / `valid` flags for the shell.
- `buildSegments()` — the timed skeleton with blocks dropped in order.
