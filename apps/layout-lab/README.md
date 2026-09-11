# Layout Lab

Two reference sheets, turned into a site you can open.

The sheets catalogued **74 avant-garde page layouts** across four rounds and
**29 page sections in 142 variants**. They were single HTML files full of tiny
grey wireframes — useful for remembering that a layout exists, useless for
knowing what it feels like to use one. This app keeps the whole catalogue and
then builds the first round for real: twenty-four working pages you can open,
resize, scroll, type into and drag.

```
pnpm --filter @ujg/layout-lab dev        # localhost:4321
pnpm --filter @ujg/layout-lab build
pnpm --filter @ujg/layout-lab test       # catalogue parity + demo hygiene
pnpm --filter @ujg/layout-lab isolation  # what the build actually shipped
pnpm --filter @ujg/layout-lab a11y       # needs Chromium
pnpm --filter @ujg/layout-lab smoke      # needs Chromium
```

## What is real and what is not

| | Layouts | Built as pages |
|---|---|---|
| Round 1 — The Rule-Breakers | 24 | **24** |
| Round 2 — Reactive & Living Surfaces | 17 | 0 |
| Round 3 — Dimensional & Beyond-Flat | 16 | 0 |
| Round 4 — Narrative, Game & AI-Native | 17 | 0 |

Every layout has a catalogue entry, its risk rating, and its original wireframe.
Only Round 1 has pages behind it. A card says **Demo** or **Wireframe** and
`isolation-check` fails the build if a card ever says Demo without a page
existing — that is the one lie this tool must not tell.

Rounds 2 to 4 are not a backlog waiting for an afternoon. Several of those
entries — the WebGL configurator, the fluid-simulation background, the
audio-reactive hero, the physics playground — are each a serious build rather
than a layout, and some of them are a bad idea for most clients. Which of them
become real is a decision to take one at a time.

The 29 sections are catalogue-and-wireframe throughout. Sections are parts, not
pages; the demos above are where a section shape can actually be seen at work.

## How it is put together

```
reference/          the two frozen source sheets. Never edited.
scripts/extract.mjs parses them into src/data/catalog.json
src/data/           generated. Do not hand-edit.
src/lib/catalog.ts  types the catalogue and answers "is there a demo?"
src/pages/          index, /layout/<slug>, /sections, /section/<slug>
src/pages/demo/     the twenty-four built pages
src/lib/demoContent.ts  the one body of copy all twenty-four render
```

**The sheets are parsed, never retyped.** Every name, blurb, risk rating and
"rare because / reach for it / watch out" line comes out of the HTML, and each
wireframe is carried across as its original markup — the drawing on a catalogue
page is literally the drawing from the sheet. `catalog-check` re-reads the
sheets with independent selectors and compares both directions, 941 assertions,
including the variant counts the section sheet prints on its own headings.

**"Has a demo" is answered by the filesystem.** `src/lib/catalog.ts` globs
`src/pages/demo/*.astro`, so a demo exists exactly when its file does. There is
no second list to fall out of sync. The glob is `{ query: "?raw" }` on purpose:
a plain glob puts every demo into the catalogue's module graph, and Vite then
hoists all twenty-four demos' global CSS into every catalogue page. That cost
62KB on the index and 62KB on every layout page before it was caught.

**Demos are separate documents, not components.** A demo is a real page in a
real layout, so it needs to write `body`, `:root` and bare element selectors the
way a real page does. Making each one its own document means it can, with no
chance of leaking into the catalogue chrome and no `.demo-` prefixing
discipline to remember. `isolation-check` proves it stayed that way in both
directions.

**One body of copy, twenty-four shapes.** Every demo renders the same invented
studio — Meridian Six, which is not a client and not a real company. When the
words are fixed, the only variable between two demos is the layout, which is
the comparison the lab exists for.

## Adding a demo

1. Write `src/pages/demo/<slug>.astro`, where `<slug>` is the layout's id in
   the catalogue.
2. Use `DemoBase`, pass it `slug`, `name` and `premise`.
3. Import the copy from `../../lib/demoContent`. Do not invent new copy.
4. Style it in one `<style is:global>` block.
5. `pnpm build && pnpm test && pnpm isolation && pnpm a11y && pnpm smoke`.

That is the whole procedure. The index, the layout page, the demo count and the
Demo/Wireframe pill all update themselves.

## Accessibility

Zero WCAG 2.1 AA violations across 34 page views — the catalogue chrome in both
palettes, and all twenty-four demos. That is a real constraint on the layouts,
not a badge: six of the twenty-four failed on first audit and were changed.

The recurring one is worth writing down. Goldenrod on Eminence is 4.3:1 and
Sienna on Goldenrod is 4.0:1 — both brand anchors, both just under the 4.5:1
that text answers to. Where the anchors had to meet as text, the *derived* tone
moved (`#E4B03E`, `#5C2507`) and the anchor stayed exact. The other repeat
offender was opacity: fading an eyebrow to 0.5 or 0.75 for "inactive" quietly
takes it under AA, every time.

Note the split thresholds. WCAG 1.4.3 asks 4.5:1 of text; 1.4.11 asks 3:1 of
non-text UI components. The orange disc in the broken-grid demo is a graphic and
answers to 3:1; the orange numeral beside it is text and does not, which is why
it is Sienna.

## Motion

Six of these layouts are motion layouts, so reduced motion is built rather than
bolted on. `DemoBase` kills animation and transition duration globally, and each
scripted demo checks `prefers-reduced-motion` itself: the marquee stops dead and
resizes rather than slowing, parallax detaches its scroll handler, and the
horizontal-scroll toggle refuses to engage at all. `smoke` asserts all three.

## Responsive

Several of these layouts are compositions for one canvas size and say so. The
honest move is to stop doing the trick, not to shrink it: the broken grid
restores its columns under 760px, the depth collage unstacks its layers, the
isometric plates lie flat, the dual scroll becomes one column, and the infinite
canvas becomes a list. `smoke` checks all twenty-four for horizontal overflow at
380px, which is how the oversized wordmark was caught pushing 51px past the edge
— viewport units do not know about the hero's own padding, so it is sized in
`cqi` now.

## Deploying

Its own Vercel project. Root Directory `apps/layout-lab`, and nothing else to
configure — `vercel.json` carries the build, the clean URLs and the
`turbo-ignore` command. Do not add comment keys to `vercel.json`; Vercel
validates it strictly and rejects unknown properties, including `//`.
