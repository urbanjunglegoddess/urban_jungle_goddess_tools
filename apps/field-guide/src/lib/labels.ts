/**
 * Display labels, carried from the original guide so the wording a client sees
 * in a call does not change under her.
 */
import type { CollectionEntry } from "astro:content";

export type Platform = CollectionEntry<"platforms">;

export const CATEGORY_LABEL: Record<string, string> = {
  gen: "General builders",
  ecom: "Ecommerce",
  cms: "CMS",
  edit: "Editors & app builders",
  land: "Landing & funnel",
  ai: "AI builders",
  comm: "Community & membership",
  dev: "Dev, static & hosting",
  niche: "Niche & specialized",
};

export const BAND_LABEL: Record<string, string> = {
  free: "Free",
  low: "Under $20/mo",
  mid: "$20–60/mo",
  high: "$60–200/mo",
  ent: "$200+/mo",
  host: "Self-host cost",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  legacy: "Legacy",
  absorbed: "Absorbed",
  retired: "Retired",
};

export const DEPTH_LABEL: Record<string, string> = {
  full: "Full — researched, sourced, dated",
  standard: "Standard — migrated from the original guide",
  stub: "Stub — kept to recognise a dead reference",
};

/** What the card and the page show for cost: the real figure if there is one. */
export function costLine(d: Platform["data"]): string {
  return d.verifiedPriceNote || BAND_LABEL[d.costBand] || d.costBand;
}

/**
 * The search haystack, matching the original's fields exactly so typing what
 * the site needs to do still finds the same platforms.
 */
export function haystack(d: Platform["data"]): string {
  return [
    d.name,
    d.description,
    d.bestFor,
    d.ceiling,
    d.hostingType,
    d.skillLevel,
    d.whoEditsIt,
    d.exitPath,
    ...d.categories.map((c) => CATEGORY_LABEL[c] ?? c),
  ]
    .join(" ")
    .toLowerCase();
}

/** Null renders as this. An honest gap, not a guess. */
export const NOT_DOCUMENTED = "Not documented";
