import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * The platform record contract.
 *
 * The rule this schema exists to enforce: a factual field may not carry a
 * value without a source and a date. Anything unverified is `null`, which the
 * template renders as "Not documented" — a correct state, and a far better one
 * than a plausible sentence that is wrong in a client call.
 *
 * Judgment fields (ceiling, buildNotes, outgrowSignals) are opinion and need
 * no source. Factual fields (plans, fees, status) do.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dates are YYYY-MM-DD");

const url = z.string().url();

/** A named plan with its list price. A price with no source is not a price. */
const plan = z.object({
  name: z.string().min(1),
  monthlyUsd: z.number().nonnegative().nullable().default(null),
  annualUsd: z.number().nonnegative().nullable().default(null),
  notes: z.string().nullable().default(null),
});

/** Money the platform takes on top of the plan — where margin actually goes. */
const fee = z.object({
  kind: z.enum([
    "transaction",
    "processing",
    "gateway surcharge",
    "revenue share",
    "listing",
    "other",
  ]),
  rate: z.string().min(1),
  appliesTo: z.string().min(1),
  notes: z.string().nullable().default(null),
});

const migration = z.object({
  difficulty: z.enum(["trivial", "easy", "moderate", "hard", "rebuild"]),
  steps: z.array(z.string()).default([]),
  notes: z.string().nullable().default(null),
});

const alternative = z.object({
  slug: z.string().min(1),
  insteadWhen: z.string().min(1),
});

export const CATEGORIES = [
  "gen",
  "ecom",
  "cms",
  "edit",
  "land",
  "ai",
  "comm",
  "dev",
  "niche",
] as const;

/**
 * The twelve hosting shapes the original guide actually used. This is not a
 * tidied taxonomy — "WordPress plugin" and "WordPress theme" are genuinely
 * different answers to "what am I buying", and collapsing them would lose the
 * distinction that decides a quote.
 */
export const HOSTING_TYPES = [
  "Hosted",
  "Self-hosted",
  "Managed hosting",
  "WordPress core",
  "WordPress plugin",
  "WordPress theme",
  "Framework",
  "Dev platform",
  "Dev tool",
  "Design tool",
  "Desktop",
  "Enterprise",
] as const;

export const SKILL_LEVELS = ["No-code", "Low-code", "Code"] as const;

export const COST_BANDS = ["free", "low", "mid", "high", "ent", "host"] as const;

export const WHO_EDITS = [
  "Client alone",
  "Client, once trained",
  "You maintain",
  "Developer required",
] as const;

export const EXIT_PATHS = [
  "Locked in",
  "Content exports only",
  "Exports to code",
  "You own the code",
] as const;

const platforms = defineCollection({
  loader: glob({ base: "./src/content/platforms", pattern: "**/*.md" }),
  schema: z
    .object({
      /* --- identity --- */
      slug: z.string().regex(/^[a-z0-9-]+$/, "slug is lowercase, digits and hyphens"),
      name: z.string().min(1),
      officialUrl: url.nullable().default(null),
      /** Parent company. Ownership predicts the roadmap. */
      owner: z.string().nullable().default(null),
      categories: z.array(z.enum(CATEGORIES)).min(1),
      hostingType: z.enum(HOSTING_TYPES),
      skillLevel: z.enum(SKILL_LEVELS),

      /* --- status --- */
      status: z.enum(["active", "legacy", "absorbed", "retired"]),
      /** The one clause of proof. Null until someone checks. */
      statusEvidence: z.string().nullable().default(null),
      statusSourceUrl: url.nullable().default(null),
      statusCheckedOn: isoDate.nullable().default(null),

      /* --- money --- */
      costBand: z.enum(COST_BANDS),
      plans: z.array(plan).default([]),
      fees: z.array(fee).default([]),
      pricingSourceUrl: url.nullable().default(null),
      pricingCheckedOn: isoDate.nullable().default(null),
      pricingConfidence: z.enum(["high", "medium", "low"]).nullable().default(null),
      /**
       * The price string exactly as the original Field Guide carried it,
       * including its own caveats ("re-verify"). Kept verbatim so nothing is
       * quietly resolved during migration.
       */
      verifiedPriceNote: z.string().nullable().default(null),

      /* --- the decision fields --- */
      bestFor: z.string().min(1),
      notFor: z.string().nullable().default(null),
      whoEditsIt: z.enum(WHO_EDITS),
      exitPath: z.enum(EXIT_PATHS),
      /** What specifically comes out, and what does not. */
      exportDetail: z.string().nullable().default(null),
      ceiling: z.string().min(1),
      /** Observable triggers that mean it is time to move. */
      outgrowSignals: z.array(z.string()).default([]),

      /* --- depth for the work --- */
      strengths: z.array(z.string()).default([]),
      limits: z.array(z.string()).default([]),
      keyIntegrations: z.array(z.string()).default([]),
      seoNotes: z.string().nullable().default(null),
      performanceNotes: z.string().nullable().default(null),
      accessibilityNotes: z.string().nullable().default(null),
      migrationIn: migration.nullable().default(null),
      migrationOut: migration.nullable().default(null),
      alternatives: z.array(alternative).default([]),

      /* --- internal, never client-facing --- */
      buildNotes: z.string().nullable().default(null),
      inUjgStack: z.boolean().default(false),
      shortlist: z.boolean().default(false),
      redFlags: z.array(z.string()).default([]),

      /* --- client-safe --- */
      /**
       * One or two sentences liftable straight into a proposal. No
       * methodology, no comparison reasoning — see the blueprint rule.
       */
      proposalLine: z.string().nullable().default(null),

      /* --- housekeeping --- */
      depth: z.enum(["full", "standard", "stub"]),
      lastReviewed: isoDate,
      confidence: z.enum(["high", "medium", "low"]),

      /** One-line description. Carried from the original guide. */
      description: z.string().min(1),
    })
    .strict()
    /* --- the fabrication guardrail, enforced --- */
    .superRefine((d, ctx) => {
      if (d.plans.length > 0 && !d.pricingSourceUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingSourceUrl"],
          message: `${d.slug}: plans are listed with no pricingSourceUrl. No source, no figure.`,
        });
      }
      if (d.plans.length > 0 && !d.pricingCheckedOn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingCheckedOn"],
          message: `${d.slug}: plans are listed with no pricingCheckedOn date.`,
        });
      }
      if (d.fees.length > 0 && !d.pricingSourceUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pricingSourceUrl"],
          message: `${d.slug}: fees are listed with no pricingSourceUrl.`,
        });
      }
      if (d.statusEvidence && !d.statusSourceUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["statusSourceUrl"],
          message: `${d.slug}: statusEvidence is claimed with no statusSourceUrl to back it.`,
        });
      }
      // depth: full is a promise that the work was actually done.
      if (d.depth === "full") {
        for (const field of ["notFor", "proposalLine"] as const) {
          if (!d[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message: `${d.slug}: depth is "full" but ${field} is empty. Drop it to "standard" or finish it.`,
            });
          }
        }
        if (d.strengths.length === 0 || d.limits.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["depth"],
            message: `${d.slug}: depth is "full" but strengths/limits are empty. Drop it to "standard" or finish it.`,
          });
        }
      }
    }),
});

export const collections = { platforms };
