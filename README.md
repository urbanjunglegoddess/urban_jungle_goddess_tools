# Urban Jungle Goddess — Tools

Internal tooling for Urban Jungle Goddess LLC, the Afro-Futurist digital
consultancy run by Omegea Hunter.

This repo is a **container of separate sites**, not one application. Each tool
in `apps/` has its own build, its own tests and its own README. They share the
brand and nothing else.

They **ship together**, from one Vercel project: `apps/home` is the front door
at the root, and each tool is served under its own prefix. One deploy, one URL,
and links between the apps that are ordinary paths — nothing to configure and
nothing to keep in sync.

```
/                    apps/home        the front door
/field-guide         apps/field-guide
/focus               apps/focus
/layout-lab          apps/layout-lab
```

None of it is client-facing. These are the instruments used to run the
business — opened during a scoping call, not published as marketing.

---

## What's here

| Tool | Served at | What it's for |
|---|---|---|
| [`apps/field-guide`](apps/field-guide) | `/field-guide` | 228 website platforms with cost, who runs it after launch, exit path and ceiling. Opened during a client scoping call. |
| [`apps/home`](apps/home) | `/` | This list, as a page. Says what each tool does *and* what it doesn't do yet. |
| [`apps/focus`](apps/focus) | `/focus` | Focus Window: four focus tools over one shared core — fit, planner, combined dial, live session. |
| [`apps/layout-lab`](apps/layout-lab) | `/layout-lab` | 74 avant-garde layouts and 29 sections in 142 variants, catalogued — with the 24 Rule-Breakers built as real pages. |
| [`packages/brand`](packages/brand) | — | `@ujg/brand` — the UJG palette, type stack and theme switching. Every tool imports it. |
| [`work-assist/`](work-assist) | — | The Focus Window prototypes in five stacks. `apps/focus` is the one that gets maintained now. |
| [`colors/`](colors) | — | The original colour-system export. `packages/brand` replaced it for new work; not yet folded in or retired. |
| [`operations/`](operations) | — | The original single-file Field Guide. Still the only place Compare, Decide and Cost work end to end; stays until the site carries them. |

---

## Running it

Node 20+ and pnpm. Nothing else — no build toolchain behind any of it.

```bash
pnpm install
pnpm check          # typecheck, test, build and verify every app
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev servers for every app |
| `pnpm build` | Build every app, then assemble them into one `dist/` |
| `pnpm test` | Every package's tests |
| `pnpm links` | Resolve every internal link on the assembled site |
| `pnpm check` | typecheck + test + build + blueprint + isolation + assemble + links |

Anything needing a Chromium binary sits outside `pnpm check`. Run these when a
colour token, a text size, a base path or a demo changes:

| Command | What it proves |
|---|---|
| `pnpm site-smoke` | The front door opens all three tools, and each one works and is styled |
| `pnpm --filter @ujg/<app> a11y` | Zero WCAG 2.1 AA violations (all four apps have one) |
| `pnpm --filter @ujg/<app> smoke` | That app's own behaviour (field-guide, focus, layout-lab) |

To work on one app: `pnpm --filter @ujg/field-guide dev`.

**On Windows with OneDrive:** exclude this folder from sync. OneDrive tries to
sync several thousand `node_modules` files and causes slow installs and `EPERM`
errors. `.gitignore` already covers `Thumbs.db` and `desktop.ini`.

---

## The rule this repo runs on

> A field nobody has verified is `null`, and renders as **"Not documented"**.
> That is a correct state. A plausible sentence that is wrong in a client call
> is not.

This isn't a convention, it's enforced. The Field Guide's Zod schema **fails the
build** when a price or fee is recorded without a source URL and a check date,
when a status claim has no evidence link, or when a page is marked `depth: full`
without the fields that tier promises.

The same instinct runs through the rest: the home page shows what each tool
*doesn't* do yet, and `pnpm check` fails rather than warns.

---

## The brand lives in one place

`packages/brand` holds the colour tokens, the font stack and the theme
switching. It is dark-first with a working light theme, and
`pnpm --filter @ujg/brand test` enforces two rules:

- **No colour may have its only definition inside a media query.** Break that
  and the theme toggle and the OS setting disagree.
- **Every text token clears WCAG AA on every surface it's painted on**, in both
  themes — 68 pairs checked. The seven brand anchors (Night, Dark Green,
  Eminence, Spanish Orange, Goldenrod, Platinum, Sienna) are exempt: they are
  the identity. The derived greys and accents are not.

That second rule exists because the original palette was failing AA on its
muted text, on every card, in both themes — quietly, for a long time. It was
fixed with the smallest hue-preserving nudge, and the test holds the line.

There is deliberately **no** `packages/ui`. Two apps sharing tokens is the
design; two apps sharing components is a decision that wants a third case
first. It gets created the first time a real component is genuinely duplicated.

---

## The blueprint rule

Over-detailed proposals transfer value before the contract starts. A client who
can screenshot your methodology can hand it to someone cheaper.

**Client-safe:** the proposal line, what a platform is best for, the cost, and
the ceiling. Naming what a platform *cannot* do is what separates a consultant
from a salesperson.

**Not client-safe:** build notes, stack flags, and the comparison reasoning —
why the other four were ruled out.

Enforced in the template, not in a comment. Internal content sits inside a
`[data-internal]` element, and the Field Guide's handout view **detaches** those
nodes rather than hiding them: while it's on they're absent from the DOM, so
nothing internal survives a screenshot, a print, or the inspector.
`pnpm --filter @ujg/field-guide blueprint` checks all 228 built pages in both
directions.

---

## The lab does not claim what it has not built

`apps/layout-lab` catalogues 74 layouts and has built 24 of them. Every card
says which it is, and `pnpm --filter @ujg/layout-lab isolation` **fails the
build** if a card ever says "Demo" without a page behind it — the same instinct
as "Not documented", applied to work rather than to facts.

Its demos are separate documents rather than components, so a demo can write
`body` and bare element selectors the way a real page does with no chance of
leaking into the catalogue around it. The isolation check proves that in both
directions on the built output, which is how a 62KB CSS leak into every
catalogue page got caught.

## Adding a tool

1. `apps/<name>/` with its own `package.json`.
2. Import `@ujg/brand` — never copy the palette.
3. Set `base: "/<name>"` in its `astro.config.mjs`, and copy `src/lib/path.ts`
   from any other app. Every internal link goes through `path()`.
4. Add it to the `APPS` list in `scripts/assemble.mjs`.
5. Add an entry to `apps/home/src/data/tools.ts` with an honest `state` and
   `href: path("/<name>")`.

Then `pnpm check`. If a link is wrong, `links-check` says which one.

## Adding a platform to the Field Guide

One Markdown file in `apps/field-guide/src/content/platforms/`. Nothing else.
The schema will tell you what's missing.

---

## Deploying

**One Vercel project**, Root Directory at the repo root, with the build command
`pnpm run build` and output directory `dist`.

`pnpm build` runs every app's build through Turborepo, then
`scripts/assemble.mjs` copies the four outputs into a single `dist/` — home at
the root, each tool under its prefix. Assemble refuses to let the home app
overwrite a tool's directory, because a page called `field-guide.html` would
silently shadow the entire Field Guide.

Each app declares its prefix as `base` in its `astro.config.mjs`. Astro rewrites
**asset** URLs from that, but an `href` you typed by hand is just a string and
stays exactly as written — so every internal link goes through that app's
`src/lib/path.ts`. A link that skips it builds fine, reviews fine, and 404s in
production. `pnpm links` walks the built HTML and resolves all 1,125 internal
links against the files that actually exist, which is the only way to catch the
one you forgot.

Two settings in the root `vercel.json` are load-bearing: `cleanUrls` and
`trailingSlash`. Astro is configured with `build.format: "file"`, so pages are
emitted flat as `<slug>.html` while internal links are extensionless. Get that
mapping wrong and every link 404s while the index still looks perfect.

Vercel validates `vercel.json` against a strict schema and rejects any key it
doesn't recognise — including a `//` comment key. Keep notes in the README.

There are no `PUBLIC_*_URL` environment variables any more. The home page links
to each tool with a path, so there is nothing to set and nothing that can point
at a stale deployment.

**Before any of this takes a real domain**, look at Deployment Protection. These
pages carry build notes, stack flags and comparison reasoning, and preview URLs
are guessable. The handout view is a client-side toggle, not access control.

---

## Where the Field Guide is going

| Phase | State |
|---|---|
| 0 · Scaffold and migrate | Done — 228 records behind a schema, parity proven field for field |
| 1 · Pages | Done — searchable index, a page per platform, AA-clean palette |
| 2 · Depth | **Blocked** — needs outbound access to vendor pricing pages |
| 3 · Decision tools | Not started — Compare, Decide, Cost, client handout export |
| 4 · Operations | Not started — freshness page, check script, monthly action |

Phase 2 is blocked on the environment's network policy, not on effort. Every
vendor domain is denied at the egress gateway, and the only reachable sources
are third-party aggregators — exactly the source class the guardrail exists to
keep out. 37 records carry a price figure with no source URL and can't be
re-verified until that opens.
