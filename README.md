# urban_jungle_goddess_tools

A set of tools in various languages to help run my business. Turborepo monorepo, pnpm
workspaces.

## Apps

| App | What it is |
|---|---|
| [`apps/colors`](apps/colors) | **UJG Color System** — the locked reference sheet plus drop-in token files for web, react, next.js and expo. The design system everything else pulls from. |
| [`apps/work-assist`](apps/work-assist) | **Focus Window** — four focus tools, one shared core, four stacks. Consumes `@ujg/colors`. |
| [`apps/operations`](apps/operations) | **Operations** — website platform chooser and its field guide. |

## Getting started

```bash
pnpm install
```

Requires Node 20+ and pnpm. Nothing else — the tasks below are plain Node scripts with no
build toolchain behind them.

## Tasks

```bash
pnpm build       # regenerate the colour tokens from the reference HTML
pnpm test        # fidelity, collision and contrast checks
pnpm typecheck   # tsc --strict over the generated token modules
pnpm check       # all three
```

Run one app: `pnpm --filter @ujg/colors test`, or `turbo run test --filter=@ujg/work-assist`.

### What the tasks actually do

| App | `build` | `test` | `typecheck` |
|---|---|---|---|
| `@ujg/colors` | extract → generate every token file from `ujg_color_system_v2_1.html` | 1166 fidelity assertions + token collision check | `tsc --strict` on the four generated modules |
| `@ujg/work-assist` | — | palette provenance + WCAG contrast (15 pairs) + system linkage | — |
| `@ujg/operations` | — | — | — |

`@ujg/work-assist` declares `@ujg/colors` as a workspace dependency, and `test` is
`dependsOn: ["^build"]`, so the colour tokens are regenerated before anything is checked
against them. That edge is real, not decorative: `work-assist`'s contrast test reads the
generated `ujg-colors.css` off disk and fails if a `--ujg-*` reference stops resolving.

`build` is deterministic — regenerating produces byte-identical output to what's committed,
so a dirty tree after `pnpm build` means the reference HTML changed and the tokens need
committing.

## Layout

```
apps/
  colors/         ujg_color_system_v2_1.html   ← source of truth
                  ujg-color-system/  web/ react/ nextjs/ expo/ scripts/
  work-assist/    real/  html/ web/ react/ nextjs/ expo/ shared/ scripts/
                  drafts/
  operations/     website_chooser.html  website_chooser_field_guide.md
turbo.json
pnpm-workspace.yaml
```

## Notes

- `apps/colors` is a **dependency**, not a deployable app — everything else consumes it.
  Conventionally that belongs in `packages/`, and moving it is a `git mv` plus a one-line
  change to `pnpm-workspace.yaml`. It sits in `apps/` for now because that's how the
  folders were laid out.
- `apps/work-assist/drafts/` is fully redundant with `real/` — every file has an identical
  twin, zero orphans. It's kept only because nothing has said to delete it.
- `apps/operations` has no tasks yet.
