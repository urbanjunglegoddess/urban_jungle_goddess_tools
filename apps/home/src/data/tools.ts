/**
 * The tools in this repo, and the honest state of each.
 *
 * Adding a tool means adding one object here. `state` is the whole point of
 * the page: a half-finished tool that looks finished is worse than one that
 * says so, and the same rule that governs the Field Guide's data governs this
 * list — nothing claims more than it is.
 */

import { path } from "../lib/path";

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
  /** Where it is served, when it is served. A path, not a URL. */
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
  "in-repo": "Builds and passes its own checks in the repo, but is not served yet.",
  superseded: "Kept for reference; new work uses something else.",
};

/**
 * Where each tool is served.
 *
 * All four apps ship from one Vercel project — this page at the root, and each
 * tool under its own prefix. So a link is just a path: it cannot point at the
 * wrong deployment, cannot go stale, and needs no environment variable to work.
 * That replaced three PUBLIC_*_URL variables, any one of which being unset left
 * a card with no way in.
 *
 * The prefix here has to match the `base` in that app's astro.config.mjs.
 * scripts/links-check.mjs walks the assembled site and fails if a link on this
 * page does not resolve to a file that exists.
 */

export const TOOLS: Tool[] = [
  {
    name: "Website Platform Field Guide",
    blurb:
      "228 builders, CMSs, frameworks and hosted platforms — what each costs, who can run it after launch, whether the client can leave, and where it stops working.",
    usedWhen:
      "Open during a client scoping call to decide what a website project should be built on.",
    state: "live",
    path: "apps/field-guide",
    href: path("/field-guide"),
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
    state: "live",
    path: "apps/focus",
    href: path("/focus"),
    facts: [
      { label: "Tools", value: "4" },
      { label: "Shared core", value: "1 file, 113 assertions" },
      { label: "Smoke tests", value: "20" },
    ],
    notYet:
      "The four HTML prototypes in work-assist/real are still there and are now the superseded copy — they have not been deleted.",
  },
  {
    name: "Layout Lab",
    blurb:
      "74 avant-garde page layouts and 29 sections in 142 variants, catalogued from the reference sheets — with the Rule-Breakers built as real, openable pages rather than sketches.",
    usedWhen:
      "Open when a project needs a shape before it needs a page. Shows a client what a layout actually feels like instead of describing it.",
    state: "live",
    path: "apps/layout-lab",
    href: path("/layout-lab"),
    facts: [
      { label: "Layouts", value: "74" },
      { label: "Built as pages", value: "24" },
      { label: "Sections", value: "29 · 142 variants" },
      { label: "A11y", value: "0 violations, 34 views" },
    ],
    notYet:
      "Rounds 2 to 4 — 50 layouts — are catalogue and wireframe only. Several of them (WebGL scenes, fluid simulation, audio-reactive) are a build each, not a layout each, so which ones get made real is a decision, not a backlog.",
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
