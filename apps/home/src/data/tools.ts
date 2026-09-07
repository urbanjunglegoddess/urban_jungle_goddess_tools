/**
 * The tools in this repo, and the honest state of each.
 *
 * Adding a tool means adding one object here. `state` is the whole point of
 * the page: a half-finished tool that looks finished is worse than one that
 * says so, and the same rule that governs the Field Guide's data governs this
 * list — nothing claims more than it is.
 */

export type ToolState = "live" | "in-repo" | "superseded";

export interface Tool {
  name: string;
  /** One line. What it is, not what it aspires to be. */
  blurb: string;
  /** Who it is for and when it gets opened. */
  usedWhen: string;
  state: ToolState;
  /** Where it lives in the repo. */
  path: string;
  /** Deployed URL, when there is one. */
  href?: string;
  /** Live figures worth showing on the card. */
  facts?: { label: string; value: string }[];
  /** What is deliberately not done yet. Shown, not hidden. */
  notYet?: string;
}

export const STATE_LABEL: Record<ToolState, string> = {
  live: "Live",
  "in-repo": "In the repo",
  superseded: "Superseded",
};

export const STATE_NOTE: Record<ToolState, string> = {
  live: "Deployed and in use.",
  "in-repo": "Real and working, but not yet its own app or deploy.",
  superseded: "Kept for reference; new work uses something else.",
};

/**
 * Deployed URLs come from the environment, never from a literal here.
 *
 * A front door with a wrong link is worse than one with no link, and this repo
 * has no way to know what domain a Vercel project ended up on. Set
 * PUBLIC_FIELD_GUIDE_URL in the Vercel project (or a local .env) and the Open
 * button appears; leave it unset and the card says so.
 */
const url = (v: string | undefined): string | undefined =>
  v && /^https?:\/\//.test(v) ? v : undefined;

export const TOOLS: Tool[] = [
  {
    name: "Website Platform Field Guide",
    blurb:
      "228 builders, CMSs, frameworks and hosted platforms — what each costs, who can run it after launch, whether the client can leave, and where it stops working.",
    usedWhen:
      "Open during a client scoping call to decide what a website project should be built on.",
    state: "live",
    path: "apps/field-guide",
    href: url(import.meta.env.PUBLIC_FIELD_GUIDE_URL),
    facts: [
      { label: "Platforms", value: "228" },
      { label: "Shortlist", value: "10" },
      { label: "In your stack", value: "7" },
      { label: "Depth", value: "223 standard · 5 stub" },
    ],
    notYet:
      "Pricing is carried from the original guide and 37 figures still have no source URL. Compare, Decide and Cost are not built yet.",
  },
  {
    name: "Focus Window",
    blurb:
      "Four focus tools over one shared core — a fit calculator, a planner, a combined dial, and a live session that locks to the clock.",
    usedWhen: "Personal work sessions. Also drops into a client site as an embed.",
    state: "in-repo",
    path: "work-assist/real",
    facts: [
      { label: "Tools", value: "4" },
      { label: "Stacks", value: "HTML · web · React · Next.js · Expo" },
    ],
    notYet:
      "Not a workspace app, so it has no build, no tests and no deploy. Moving it to apps/ is a rename plus a package.json.",
  },
  {
    name: "Website Chooser (original)",
    blurb:
      "The single HTML file the Field Guide was built from — the same 228 records, plus the router, the eight intake questions, the finalist table and the cost bands, all in one page.",
    usedWhen:
      "Still the only place the finalist comparison and the intake script are usable end to end.",
    state: "superseded",
    path: "operations/website_chooser.html",
    notYet:
      "Stays in use until the Field Guide site carries Compare, Decide and Cost. A frozen copy is the migration source and the parity check reads it — do not edit that one.",
  },
  {
    name: "UJG Colour System",
    blurb:
      "The original palette export — drop-in token files for web, React, Next.js and Expo, plus the scripts that generated and verified them.",
    usedWhen: "Reference. New work imports @ujg/brand instead.",
    state: "superseded",
    path: "colors/ujg-color-system",
    notYet:
      "packages/brand is now the single source, and it enforces contrast the original did not. This folder has not been folded in or retired.",
  },
];
