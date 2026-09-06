# Urban Jungle Goddess — Tools

Internal tooling for Urban Jungle Goddess LLC, the Afro-Futurist digital
consultancy run by Omegea Hunter.

This repo is a **container of separate sites**, not one application. Each tool
in `apps/` has its own build, its own Vercel project, and can take its own
domain. They share the brand and nothing else. `apps/home` is the front door
that lists them.

None of it is client-facing. These are the instruments used to run the
business — opened during a scoping call, not published as marketing.

---

## What's here

| Tool | State | What it's for |
|---|---|---|
| [`apps/field-guide`](apps/field-guide) | **Live** | 228 website platforms with cost, who runs it after launch, exit path and ceiling. Opened during a client scoping call. |
| [`apps/home`](apps/home) | **Live** | This list, as a page. Says what each tool does *and* what it doesn't do yet. |
| [`packages/brand`](packages/brand) | In use | `@ujg/brand` — the UJG palette, type stack and theme switching. Every tool imports it. |
| [`work-assist/`](work-assist) | In the repo | Focus Window: four focus tools over one shared core, in five stacks. Real and working, but not yet a workspace app. |
| [`colors/`](colors) | Superseded | The original colour-system export. `packages/brand` replaced it for new work; not yet folded in or retired. |
| [`operations/`](operations) | Superseded | The original single-file Field Guide. Still the only place Compare, Decide and Cost work end to end; stays until the site carries them. |

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
| `pnpm build` | Build every app |
| `pnpm test` | Every package's tests |
| `pnpm check` | typecheck + test + build + blueprint |

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

## Adding a tool

1. `apps/<name>/` with its own `package.json`.
2. Import `@ujg/brand` — never copy the palette.
3. Add an entry to `apps/home/src/data/tools.ts`, with an honest `state`.
4. Its own Vercel project, Root Directory `apps/<name>`, with a `turbo-ignore`
   step so it only rebuilds when it actually changes.

Nothing in any other app should need to change.

## Adding a platform to the Field Guide

One Markdown file in `apps/field-guide/src/content/platforms/`. Nothing else.
The schema will tell you what's missing.

---

## Deploying

Each app is its own Vercel project with Root Directory set to that app, and
"Include files outside the Root Directory" enabled so the pnpm workspace
resolves. `vercel.json` in each app sets the `turbo-ignore` step, so a commit
touching one app doesn't rebuild the others.

Two settings in those files are load-bearing: `cleanUrls` and `trailingSlash`.
Astro is configured with `build.format: "file"`, so pages are emitted flat as
`<slug>.html` while internal links are extensionless. Get that mapping wrong and
every link 404s while the index still looks perfect.

Vercel validates `vercel.json` against a strict schema and rejects any key it
doesn't recognise — including a `//` comment key. Keep notes in the app README.

`apps/home` links to the Field Guide via `PUBLIC_FIELD_GUIDE_URL`. Unset is a
valid state: the card renders without an Open button rather than with a guessed
link. See `apps/home/.env.example`.

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
