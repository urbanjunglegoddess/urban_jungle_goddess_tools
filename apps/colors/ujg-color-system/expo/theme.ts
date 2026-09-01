/**
 * Flat palette for React Native StyleSheet — plain values, no CSS variables.
 * Generated from ujg_color_system_v2_1.html. Values are verbatim; do not hand-edit.
 */

export const T = {
  night: "#0A0A0A", // Night — Primary Base
  deepAmethyst: "#47107D", // Deep Amethyst — Tech & Royal
  sunsetEmber: "#D9531A", // Sunset Ember — Energy & Action
  luminousGold: "#F2B01E", // Luminous Gold — Wealth & Legacy
  richForest: "#0D5E39", // Rich Forest — Nature Core
  platinum: "#E8E6E1", // Platinum — Neutral & Contrast
  mutedPlatinum: "#A8A5A0", // Muted Platinum — secondary text
  richJungleGreen: "#2E6B4F", // Rich Jungle Green — success
  midnightForest: "#042F1E", // Midnight Forest — Deepest Forest
  clayEmber: "#C15C27", // Clay Ember — Burnt Clay
  harvestGold: "#E1A443", // Harvest Gold — Soft Amber
  sage: "#587156", // Sage — Herbal Neutral
  marigold: "#E28D1F", // Marigold — Warm Accent
  warmSand: "#F7DFC0", // Warm Sand — Warm Light
  terracotta: "#B04720", // Terracotta — Grounded Earth

  primary: "#0A0A0A", // role: Primary — logos, headers
  secondary: "#47107D", // role: Secondary — key UI, accents
  accent: "#F2B01E", // role: Accent — highlights, links
  ctaAction: "#D9531A", // role: CTA / Action
  neutralDark: "#0D5E39", // role: Neutral Dark — text, borders
  neutralMid: "#A8A5A0", // role: Neutral Mid — secondary text
  neutralLight: "#E8E6E1", // role: Neutral Light — backgrounds
  success: "#2E6B4F", // role: Success
  warning: "#F2B01E", // role: Warning
  errorUrgent: "#D9531A", // role: Error / Urgent
  info: "#47107D", // role: Info
} as const;

export type Theme = typeof T;
