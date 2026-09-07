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
| `live` | Deployed and in use. Gets the full-width card. |
| `in-repo` | Real and working, but not its own app or deploy yet. |
| `superseded` | Kept for reference; new work uses something else. |

`notYet` is not optional in spirit. Every card says what the tool does *not* do
yet — the same rule the Field Guide runs on, applied to the tools themselves. A
half-finished tool that looks finished is worse than one that says so.

## Linking a deployment

Deployed URLs come from the environment, never from a literal in the data.

```
PUBLIC_FIELD_GUIDE_URL=https://…
```

Set it in the Vercel project or a local `.env` (see `.env.example`). Unset is a
valid state — the card renders without an Open button rather than with a
guessed link, and the card says so.

## Styling

Its own small stylesheet importing `@ujg/brand`. No colour is defined here.

There is deliberately no shared component package: two apps sharing tokens is
the design, two apps sharing components wants a third case first.
