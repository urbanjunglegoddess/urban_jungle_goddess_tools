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
  "in-repo": "Builds and passes its own checks in the repo, but has no deploy yet.",
  superseded: "Kept for reference; new work uses something else.",
};

/**
 * Deployed URLs come from the environment, never from a literal here.
 *
 * A front door with a wrong link is worse than one with no link, and this repo
 * has no way to know what domain a Vercel project ended up on. Set the tool's
 * PUBLIC_*_URL in that tool's own Vercel project (or a local .env) and the Open
 * button appears; leave it unset and the card says so. Each app deploys as its
 * own project, so the variable has to be set on THIS project — apps/home — not
 * on the one it points at.
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
    path: "apps/focus",
    href: url(import.meta.env.PUBLIC_FOCUS_URL),
    facts: [
      { label: "Tools", value: "4" },
      { label: "Shared core", value: "1 file, 113 assertions" },
      { label: "Smoke tests", value: "20" },
    ],
    notYet:
      "No deploy. The four HTML prototypes in work-assist/real are still there and are now the superseded copy — they have not been deleted.",
  },
  {
    name: "Layout Lab",
    blurb:
      "74 avant-garde page layouts and 29 sections in 142 variants, catalogued from the reference sheets — with the Rule-Breakers built as real, openable pages rather than sketches.",
    usedWhen:
      "Open when a project needs a shape before it needs a page. Shows a client what a layout actually feels like instead of describing it.",
    state: "in-repo",
    path: "apps/layout-lab",
    href: url(import.meta.env.PUBLIC_LAYOUT_LAB_URL),
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
