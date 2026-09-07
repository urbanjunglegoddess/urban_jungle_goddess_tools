# Website Platform Field Guide

The scoping instrument. 228 website builders, CMSs, ecommerce platforms,
frameworks, and hosting platforms — each carrying what actually decides a
project: what it costs, who can run it after launch, whether the client can
leave, and where it stops working.

This is an internal tool. It is opened during a client call, not published as
marketing.

## Running it

```bash
pnpm install          # from the repo root
pnpm --filter @ujg/field-guide dev
```

| Command | What it does |
|---|---|
| `pnpm dev` | Astro dev server |
| `pnpm build` | Static build to `dist/` |
| `pnpm typecheck` | `astro check` — types and Astro diagnostics |
| `pnpm test` | Migration parity check against the original HTML |
| `pnpm migrate` | Re-derive content files from the frozen original |

## The data

Every platform is one Markdown file in `src/content/platforms/`. The contract
is `src/content.config.ts` — a Zod schema that **fails the build** on malformed
data rather than shipping it.

Adding platform 229 means adding one Markdown file. Nothing else.

### The fabrication guardrail

The schema enforces the rule this tool lives or dies by:

- A field nobody has verified is `null`, and renders as "Not documented". That
  is a correct state. A plausible sentence that is wrong in a client call is not.
- `plans` or `fees` without a `pricingSourceUrl` and `pricingCheckedOn` **fails
  the build**. No source, no figure.
- `statusEvidence` without a `statusSourceUrl` **fails the build**.
- `depth: full` without `notFor`, `proposalLine`, `strengths` and `limits`
  **fails the build** — the tier is a promise that the work was done.

Judgment fields — `ceiling`, `buildNotes`, `outgrowSignals` — are opinion and
need no source. Factual fields do.

### Depth tiers

| Tier | Meaning |
|---|---|
| `full` | Researched, sourced, dated. The ~30 platforms actually quoted. |
| `standard` | The original guide's fields, cleanly migrated. Honest and short. |
| `stub` | Retired or absorbed. Kept so a dead reference is recognised in a call. |

The tier is shown on the page, so it is always clear what is being looked at.

## The blueprint rule

Client-safe: `proposalLine`, `bestFor`, cost, and `ceiling`. Naming what a
platform cannot do is what separates a consultant from a salesperson.

Not client-safe: `buildNotes`, `inUjgStack`, and comparison reasoning. These
stay behind internal styling and out of the client handout view — enforced in
the template, not in a comment.

## Migration provenance

`reference/website_chooser.source.html` is the original single-file guide,
frozen. It is the migration source and the parity check reads it — do not edit
it. The live copy at `operations/website_chooser.html` stays in place until
this site replaces it.

`pnpm test` proves the content collection still carries every fact the original
carried, field for field, in both directions.

## Deploying

Its own Vercel project, Root Directory `apps/field-guide`, with
"Include files outside the Root Directory" enabled so the pnpm workspace
resolves. `vercel.json` sets the `turbo-ignore` step, so a commit touching only
another app does not rebuild this one.
