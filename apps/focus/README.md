# Focus Window

Four focus tools over one shared core. Say when you have to stop, see which
session style fits the time you actually have, load what you need to get
through, and let it keep time.

```bash
pnpm --filter @ujg/focus dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Astro dev server |
| `pnpm build` | Static build to `dist/` |
| `pnpm typecheck` | `astro check` |
| `pnpm test` | `focusCore` contract — 113 assertions |
| `pnpm smoke` | Browser test of all four tools (needs Chromium) |
| `pnpm a11y` | WCAG 2.1 AA audit of all five pages (needs Chromium) |

`smoke` and `a11y` are out of `pnpm check` because they need a Chromium
binary. Set `CHROMIUM_PATH` if Playwright's own download is not present.

## The ladder

| # | Tool | What it adds |
|---|---|---|
| 1 | **Fit** (`/fit`) | Window in → every session style measured at once. A calculator. |
| 2 | **Planner** (`/planner`) | Blocks and a static timed plan. |
| 3 | **Combined** (`/combined`) | The compare grid becomes the dial that feeds the plan. |
| 4 | **Live** (`/live`) | Start: locks to the clock, live now-line, hand-off chime. |

Live is the superset; 1–3 are shallower depths of the same thing.

## One knob

There is one island, `src/scripts/focus.ts`. The page sets `data-variant` on
its root and the shell follows — which sections render, whether the compare
grid is a readout or a dial, whether Start exists. The four tools are not four
programs.

## Where the maths lives

`src/lib/focusCore.ts` — pure functions, no DOM, no framework, no storage, no
timers. One copy. Before this app existed there were four copies of that file
across `work-assist/real/{shared,react,nextjs,expo}` quietly drifting apart.

`pnpm test` asserts the invariants the original README only claimed:

- A schedule never exceeds its window, and `used + spare === T` for every style
  at every window length tested.
- The trailing break is dropped unless `restLast` — which is what lets a third
  25/5 session fit in 85 minutes instead of stopping at two.
- Degenerate inputs (zero, negative, a window shorter than one session) produce
  an empty plan rather than a negative or `NaN` one.
- Blocks land on sessions in list order, and segments are contiguous.

## Colour

Focus is a dark room by design — deliberately single-theme, unlike the other
apps. Its surfaces come from two `@ujg/brand` anchors, Dark Green and
Goldenrod, and are declared locally in `site.css` rather than pushed into the
shared semantic tokens, because one consumer does not justify that.

`pnpm test` checks them at the right thresholds rather than one blanket number:
text against WCAG 1.4.3 at 4.5:1, and bars, dots and control borders against
1.4.11 at 3:1. That split is why there are two greens — `--f-work` paints the
timeline segments, `--f-work-ink` is for the completed ✓, and no single value
could honestly satisfy both.

## What it remembers

Blocks and settings save in this browser when storage is available. The badge
under the block list tells the truth for wherever it is running — a private
window or blocked site data means the list is good for this session only,
and it says so rather than pretending.

A live run is pinned to the wall clock, not to the tab, so it survives a
reload and a session that started at 2:15 still ends at 2:40.
