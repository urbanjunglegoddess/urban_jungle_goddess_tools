# Urban Jungle Goddess — Tools

Internal tooling for Urban Jungle Goddess LLC. This repo is a **container of
separate sites**, not one application. Each tool in `apps/` has its own build,
its own Vercel project, and can take its own domain. They share the brand and
nothing else.

## Layout

```
apps/
  field-guide/       Website Platform Field Guide — the client scoping tool
packages/
  brand/             @ujg/brand — colour tokens, type, theme switching
colors/              UJG colour system, pre-monorepo (see Status)
work-assist/         Focus Window toolkit, pre-monorepo (see Status)
operations/          The original single-file Field Guide, still in use
```

pnpm workspaces + Turborepo. Node 20+.

```bash
pnpm install
pnpm check           # typecheck, test, and build every app
```

| Command | What it does |
|---|---|
| `pnpm dev` | Dev servers for every app |
| `pnpm build` | Build every app |
| `pnpm test` | Every app's tests |
| `pnpm check` | typecheck + test + build |

## The brand lives in one place

`packages/brand` holds the UJG colour tokens, the font stack, and the theme
switching. Every tool imports it. That is how the palette stops drifting from
tool to tool as new ones get built.

It is dark-first with a working light theme, and it enforces one rule in
`pnpm --filter @ujg/brand test`: no colour may have its only definition inside a
media query. Break that and the toggle and the OS setting disagree.

There is deliberately **no** `packages/ui`. One app does not need a shared
component library, and an empty abstraction is worse than a duplicated
component. It gets created the first time a second tool needs the same piece.

## Adding a tool

1. `apps/<name>/` with its own `package.json`.
2. Import `@ujg/brand` — do not copy the palette.
3. Its own Vercel project, Root Directory `apps/<name>`, with a `turbo-ignore`
   step so it only rebuilds when it actually changes.

Nothing in any other app should need to change.

## Status

| Directory | State |
|---|---|
| `apps/field-guide` | Phase 0 — data migrated behind a schema, index is a placeholder |
| `packages/brand` | In use by `apps/field-guide` |
| `colors/` | The original UJG colour system. Superseded by `packages/brand` for new work; not yet folded in. |
| `work-assist/` | Focus Window toolkit. Not yet an app in the workspace. |
| `operations/` | The original single-file Field Guide. Stays until `apps/field-guide` replaces it. |

A landing page listing the tools becomes `apps/home` once there are three of
them. This README covers it until then.
