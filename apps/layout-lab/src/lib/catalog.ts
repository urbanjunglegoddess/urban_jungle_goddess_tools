/**
 * The catalog, and which layouts have a real demo behind them.
 *
 * catalog.json is generated — see scripts/extract.mjs. Nothing here edits it;
 * this module only types it and answers "is there a page to open for this?"
 */
import data from "../data/catalog.json";

export interface Layout {
  slug: string;
  name: string;
  blurb: string;
  round: string;
  category: string;
  /** 1–5, as the reference sheet rated it. */
  risk: number;
  riskName: string;
  rareBecause: string | null;
  reachFor: string | null;
  watchOut: string | null;
  /** The original wireframe markup, carried verbatim from the sheet. */
  wireframe: string | null;
}

export interface Variant {
  name: string;
  blurb: string;
  wireframe: string | null;
}

export interface Section {
  slug: string;
  name: string;
  blurb: string;
  group: string;
  variants: Variant[];
}

export const LAYOUTS = data.layouts as Layout[];
export const SECTIONS = data.sections as Section[];

/**
 * A demo is a page at /demo/<slug>. "Has a demo" is therefore answered by the
 * filesystem, not by a hand-kept list that could drift from what actually ships.
 */
// Globbed as raw text, never as modules. A plain glob would put every demo
// page into this module's dependency graph, and Vite would then hoist all
// twenty-four demos' global CSS into every catalog page that imports it.
const demoModules = import.meta.glob("../pages/demo/*.astro", { query: "?raw", import: "default" });
export const DEMOS = new Set(
  Object.keys(demoModules).map((p) => p.replace(/^.*\/demo\//, "").replace(/\.astro$/, ""))
);

export const hasDemo = (slug: string): boolean => DEMOS.has(slug);

/** Rounds, in the order the sheet presents them. */
export const ROUNDS = [...new Set(LAYOUTS.map((l) => l.round))];
export const GROUPS = [...new Set(SECTIONS.map((s) => s.group))];

export function layoutsByCategory(round: string): { category: string; layouts: Layout[] }[] {
  const inRound = LAYOUTS.filter((l) => l.round === round);
  const cats = [...new Set(inRound.map((l) => l.category))];
  return cats.map((category) => ({ category, layouts: inRound.filter((l) => l.category === category) }));
}

export const RISK_NOTE: Record<string, string> = {
  Bold: "A confident choice. Safe to ship with ordinary care.",
  Risky: "Needs deliberate craft. One sloppy detail reads as a bug.",
  Daring: "Expensive to build and to maintain. Budget for it.",
  Reckless: "Breaks a core web expectation. Ship a fallback or don't ship it.",
};
