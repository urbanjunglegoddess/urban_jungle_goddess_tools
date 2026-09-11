# Home

The front door. Lists every tool in the repo, what state each is in, and where
to open it.

```bash
pnpm --filter @ujg/home dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Astro dev server |
| `pnpm build` | Static build to `dist/` |
| `pnpm typecheck` | `astro check` |
| `pnpm a11y` | WCAG 2.1 AA audit in both themes (needs Chromium) |

## Adding a tool

One object in `src/data/tools.ts`. Nothing else.

The `state` field is the point of the page:

| State | Means |
|---|---|
| `live` | Served, and in use. Gets the full-width card. |
| `in-repo` | Real and working, but not served yet. |
| `superseded` | Kept for reference; new work uses something else. |

`notYet` is not optional in spirit. Every card says what the tool does *not* do
yet — the same rule the Field Guide runs on, applied to the tools themselves. A
half-finished tool that looks finished is worse than one that says so.

## Linking a tool

All four apps ship from one deploy — this page at the root, each tool under its
own prefix — so a link is a path, not a URL:

```ts
href: path("/layout-lab"),
```

`path()` is `src/lib/path.ts`. The prefix has to match the `base` in that app's
`astro.config.mjs`, and `scripts/links-check.mjs` at the repo root walks the
assembled site and fails the build if a link here does not resolve to a file
that exists.

This replaced three `PUBLIC_*_URL` environment variables. Any one of them left
unset meant a card with no way in, and nothing in the repo could tell you that
had happened. A path cannot point at the wrong deployment and cannot go stale.

## Styling

Its own small stylesheet importing `@ujg/brand`. No colour is defined here.

There is deliberately no shared component package: two apps sharing tokens is
the design, two apps sharing components wants a third case first.
