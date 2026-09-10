/**
 * UJG Color System — SYSTEM LAYER for Expo / React Native.
 * No CSS in RN — use ujgSemantic[mode] and ujgScales directly in StyleSheet.create().
 *
 * Generated from ujg_color_system_v2_1.html via generate-system.mjs. Do not hand-edit.
 */

export type UjgStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;
export type UjgScaleName =
  "night" | "deepAmethyst" | "sunsetEmber" | "luminousGold" | "richForest" | "platinum" | "mutedPlatinum" | "richJungleGreen" | "midnightForest" | "clayEmber" | "harvestGold" | "sage" | "marigold" | "warmSand" | "terracotta";

/** Tonal ramps, brand-tinted and perceptually even (OKLCH). */
export const ujgScales = {
  night: { 50: "#F6F6F6", 100: "#EAEAEA", 200: "#D7D7D7", 300: "#BEBEBE", 400: "#A3A3A3", 500: "#888888", 600: "#6F6F6F", 700: "#575757", 800: "#404040", 900: "#2A2A2A", 950: "#171717" },
  deepAmethyst: { 50: "#F7F4FF", 100: "#EDE6FE", 200: "#DDCEFD", 300: "#CAADFE", 400: "#B28BF3", 500: "#996DDC", 600: "#7F53BF", 700: "#663BA0", 800: "#4D267E", 900: "#34145A", 950: "#1F053B" },
  sunsetEmber: { 50: "#FFF3EF", 100: "#FFE4DB", 200: "#FDC9B8", 300: "#FDA587", 400: "#F77A4C", 500: "#DE5821", 600: "#BC4002", 700: "#963100", 800: "#6F2403", 900: "#4A1703", 950: "#2E0900" },
  luminousGold: { 50: "#FFF4E4", 100: "#FEE7C1", 200: "#F9D08B", 300: "#E9B555", 400: "#D29709", 500: "#AF7F15", 600: "#906707", 700: "#725104", 800: "#543B05", 900: "#392601", 950: "#211501" },
  richForest: { 50: "#E7FCEE", 100: "#D4F4DF", 200: "#B7E3C8", 300: "#95CEAB", 400: "#73B48D", 500: "#539A71", 600: "#388059", 700: "#206742", 800: "#0B4D2E", 900: "#03331C", 950: "#011D0E" },
  platinum: { 50: "#F6F6F4", 100: "#EBEAE8", 200: "#D8D7D4", 300: "#C0BEBA", 400: "#A5A39F", 500: "#8A8884", 600: "#716F6B", 700: "#595753", 800: "#41403D", 900: "#2B2A27", 950: "#181715" },
  mutedPlatinum: { 50: "#F6F6F4", 100: "#ECEAE8", 200: "#D8D6D3", 300: "#C0BEBA", 400: "#A6A39E", 500: "#8B8883", 600: "#726F6A", 700: "#5A5753", 800: "#42403C", 900: "#2B2A27", 950: "#181715" },
  richJungleGreen: { 50: "#E9FBF1", 100: "#D7F2E3", 200: "#BCE1CD", 300: "#9BCCB2", 400: "#7AB295", 500: "#5B9879", 600: "#417E61", 700: "#2A644A", 800: "#174B35", 900: "#073221", 950: "#021D11" },
  midnightForest: { 50: "#ECFAF2", 100: "#DDF0E5", 200: "#C4DED0", 300: "#A6C8B5", 400: "#87AE99", 500: "#6A937E", 600: "#517A65", 700: "#3B614E", 800: "#274838", 900: "#163024", 950: "#081C12" },
  clayEmber: { 50: "#FFF3EE", 100: "#FFE4D9", 200: "#FDCAB3", 300: "#FDA67E", 400: "#E78659", 500: "#CE6834", 600: "#B14D13", 700: "#8D3C0C", 800: "#6B2A03", 900: "#471A03", 950: "#2C0C00" },
  harvestGold: { 50: "#FFF4E5", 100: "#FEE7C7", 200: "#F7D09A", 300: "#E6B56D", 400: "#CF9841", 500: "#B37C1A", 600: "#94650D", 700: "#754F07", 800: "#563A07", 900: "#3A2501", 950: "#221401" },
  sage: { 50: "#F0F9EF", 100: "#E2EFE1", 200: "#CBDDCA", 300: "#B0C6AE", 400: "#93AB91", 500: "#779175", 600: "#5E775C", 700: "#475F46", 800: "#324631", 900: "#1F2F1E", 950: "#0F1B0E" },
  marigold: { 50: "#FFF4E9", 100: "#FFE6CE", 200: "#FDCC9D", 300: "#F3AE65", 400: "#DD8F34", 500: "#BE7516", 600: "#9D5F08", 700: "#7C4A04", 800: "#5C3605", 900: "#3E2201", 950: "#251201" },
  warmSand: { 50: "#FCF5EB", 100: "#F4E9DB", 200: "#E3D4C2", 300: "#CEBBA3", 400: "#B5A085", 500: "#9B8568", 600: "#806B4F", 700: "#67543A", 800: "#4E3D27", 900: "#342716", 950: "#1F1508" },
  terracotta: { 50: "#FFF3EF", 100: "#FEE4DB", 200: "#FFC9B7", 300: "#FCA689", 400: "#EA8361", 500: "#D0643F", 600: "#B34A23", 700: "#953207", 800: "#6E2507", 900: "#4C1501", 950: "#2D0A01" },
} as const satisfies Record<UjgScaleName, Record<UjgStep, string>>;

export type UjgSemanticToken =
  "surfaceBase" |
  "surfaceRaised" |
  "surfaceSunken" |
  "surfaceOverlay" |
  "surfaceInverse" |
  "textDefault" |
  "textMuted" |
  "textSubtle" |
  "textInverse" |
  "textLink" |
  "textLinkHover" |
  "borderSubtle" |
  "borderDefault" |
  "borderStrong" |
  "borderFocus" |
  "focusRing" |
  "actionPrimaryBg" |
  "actionPrimaryHover" |
  "actionPrimaryActive" |
  "actionPrimaryDisabled" |
  "actionPrimaryFg" |
  "actionSecondaryBg" |
  "actionSecondaryHover" |
  "actionSecondaryBorder" |
  "actionSecondaryFg" |
  "ctaBg" |
  "ctaHover" |
  "ctaFg" |
  "accent" |
  "accentHover" |
  "accentFg" |
  "successFg" |
  "successBg" |
  "successBorder" |
  "warningFg" |
  "warningBg" |
  "warningBorder" |
  "errorFg" |
  "errorBg" |
  "errorBorder" |
  "infoFg" |
  "infoBg" |
  "infoBorder";

/** Semantic role tokens for both modes. Reference these in product UI. */
export const ujgSemantic = {
  dark: {
    surfaceBase: "#0A0A0A",
    surfaceRaised: "#2A2A2A",
    surfaceSunken: "#000000",
    surfaceOverlay: "#404040",
    surfaceInverse: "#E8E6E1",
    textDefault: "#E8E6E1",
    textMuted: "#A8A5A0",
    textSubtle: "#A3A3A3",
    textInverse: "#0A0A0A",
    textLink: "#D29709",
    textLinkHover: "#E9B555",
    borderSubtle: "#404040",
    borderDefault: "#575757",
    borderStrong: "#888888",
    borderFocus: "#B28BF3",
    focusRing: "#B28BF3",
    actionPrimaryBg: "#47107D",
    actionPrimaryHover: "#7F53BF",
    actionPrimaryActive: "#4D267E",
    actionPrimaryDisabled: "#34145A",
    actionPrimaryFg: "#E8E6E1",
    actionSecondaryBg: "#2A2A2A",
    actionSecondaryHover: "#404040",
    actionSecondaryBorder: "#6F6F6F",
    actionSecondaryFg: "#E8E6E1",
    ctaBg: "#D9531A",
    ctaHover: "#BC4002",
    ctaFg: "#0A0A0A",
    accent: "#F2B01E",
    accentHover: "#D29709",
    accentFg: "#0A0A0A",
    successFg: "#9BCCB2",
    successBg: "#073221",
    successBorder: "#2A644A",
    warningFg: "#E9B555",
    warningBg: "#392601",
    warningBorder: "#725104",
    errorFg: "#FDA587",
    errorBg: "#4A1703",
    errorBorder: "#963100",
    infoFg: "#CAADFE",
    infoBg: "#34145A",
    infoBorder: "#663BA0",
  },
  light: {
    surfaceBase: "#F6F6F4",
    surfaceRaised: "#FFFFFF",
    surfaceSunken: "#EBEAE8",
    surfaceOverlay: "#FFFFFF",
    surfaceInverse: "#0A0A0A",
    textDefault: "#0A0A0A",
    textMuted: "#6F6F6F",
    textSubtle: "#888888",
    textInverse: "#E8E6E1",
    textLink: "#7F53BF",
    textLinkHover: "#4D267E",
    borderSubtle: "#D8D7D4",
    borderDefault: "#C0BEBA",
    borderStrong: "#726F6A",
    borderFocus: "#996DDC",
    focusRing: "#996DDC",
    actionPrimaryBg: "#47107D",
    actionPrimaryHover: "#4D267E",
    actionPrimaryActive: "#34145A",
    actionPrimaryDisabled: "#DDCEFD",
    actionPrimaryFg: "#E8E6E1",
    actionSecondaryBg: "#FFFFFF",
    actionSecondaryHover: "#EBEAE8",
    actionSecondaryBorder: "#A5A39F",
    actionSecondaryFg: "#0A0A0A",
    ctaBg: "#D9531A",
    ctaHover: "#963100",
    ctaFg: "#0A0A0A",
    accent: "#F2B01E",
    accentHover: "#725104",
    accentFg: "#0A0A0A",
    successFg: "#2A644A",
    successBg: "#E9FBF1",
    successBorder: "#9BCCB2",
    warningFg: "#543B05",
    warningBg: "#FFF4E4",
    warningBorder: "#E9B555",
    errorFg: "#963100",
    errorBg: "#FFF3EF",
    errorBorder: "#FDA587",
    infoFg: "#663BA0",
    infoBg: "#F7F4FF",
    infoBorder: "#CAADFE",
  },
} as const;

export type UjgMode = keyof typeof ujgSemantic;

/** WCAG 2.1 contrast checks for the key pairings, per mode. */
export const ujgContrast = {
  dark: [
    { label: "Body text on base surface", fg: "#E8E6E1", bg: "#0A0A0A", size: "normal", ratio: 15.87, aa: true, aaa: true },
    { label: "Body text on raised surface", fg: "#E8E6E1", bg: "#2A2A2A", size: "normal", ratio: 11.51, aa: true, aaa: true },
    { label: "Muted text on base surface", fg: "#A8A5A0", bg: "#0A0A0A", size: "normal", ratio: 8.07, aa: true, aaa: true },
    { label: "Subtle text on base surface", fg: "#A3A3A3", bg: "#0A0A0A", size: "large", ratio: 7.85, aa: true, aaa: true },
    { label: "Link on base surface", fg: "#D29709", bg: "#0A0A0A", size: "normal", ratio: 7.7, aa: true, aaa: true },
    { label: "Primary button label", fg: "#E8E6E1", bg: "#47107D", size: "normal", ratio: 10.28, aa: true, aaa: true },
    { label: "Secondary button label", fg: "#E8E6E1", bg: "#2A2A2A", size: "normal", ratio: 11.51, aa: true, aaa: true },
    { label: "CTA label", fg: "#0A0A0A", bg: "#D9531A", size: "normal", ratio: 4.9, aa: true, aaa: false },
    { label: "Accent label", fg: "#0A0A0A", bg: "#F2B01E", size: "normal", ratio: 10.37, aa: true, aaa: true },
    { label: "Success text on success surface", fg: "#9BCCB2", bg: "#073221", size: "normal", ratio: 7.85, aa: true, aaa: true },
    { label: "Warning text on warning surface", fg: "#E9B555", bg: "#392601", size: "normal", ratio: 7.72, aa: true, aaa: true },
    { label: "Error text on error surface", fg: "#FDA587", bg: "#4A1703", size: "normal", ratio: 7.71, aa: true, aaa: true },
    { label: "Info text on info surface", fg: "#CAADFE", bg: "#34145A", size: "normal", ratio: 7.84, aa: true, aaa: true },
    { label: "Focus ring on base surface", fg: "#B28BF3", bg: "#0A0A0A", size: "large", ratio: 7.43, aa: true, aaa: true },
    { label: "Strong border on base surface", fg: "#888888", bg: "#0A0A0A", size: "large", ratio: 5.58, aa: true, aaa: true },
  ],
  light: [
    { label: "Body text on base surface", fg: "#0A0A0A", bg: "#F6F6F4", size: "normal", ratio: 18.3, aa: true, aaa: true },
    { label: "Body text on raised surface", fg: "#0A0A0A", bg: "#FFFFFF", size: "normal", ratio: 19.8, aa: true, aaa: true },
    { label: "Muted text on base surface", fg: "#6F6F6F", bg: "#F6F6F4", size: "normal", ratio: 4.64, aa: true, aaa: false },
    { label: "Subtle text on base surface", fg: "#888888", bg: "#F6F6F4", size: "large", ratio: 3.28, aa: true, aaa: false },
    { label: "Link on base surface", fg: "#7F53BF", bg: "#F6F6F4", size: "normal", ratio: 4.99, aa: true, aaa: false },
    { label: "Primary button label", fg: "#E8E6E1", bg: "#47107D", size: "normal", ratio: 10.28, aa: true, aaa: true },
    { label: "Secondary button label", fg: "#0A0A0A", bg: "#FFFFFF", size: "normal", ratio: 19.8, aa: true, aaa: true },
    { label: "CTA label", fg: "#0A0A0A", bg: "#D9531A", size: "normal", ratio: 4.9, aa: true, aaa: false },
    { label: "Accent label", fg: "#0A0A0A", bg: "#F2B01E", size: "normal", ratio: 10.37, aa: true, aaa: true },
    { label: "Success text on success surface", fg: "#2A644A", bg: "#E9FBF1", size: "normal", ratio: 6.47, aa: true, aaa: false },
    { label: "Warning text on warning surface", fg: "#543B05", bg: "#FFF4E4", size: "normal", ratio: 9.63, aa: true, aaa: true },
    { label: "Error text on error surface", fg: "#963100", bg: "#FFF3EF", size: "normal", ratio: 7.06, aa: true, aaa: true },
    { label: "Info text on info surface", fg: "#663BA0", bg: "#F7F4FF", size: "normal", ratio: 7.17, aa: true, aaa: true },
    { label: "Focus ring on base surface", fg: "#996DDC", bg: "#F6F6F4", size: "large", ratio: 3.48, aa: true, aaa: false },
    { label: "Strong border on base surface", fg: "#726F6A", bg: "#F6F6F4", size: "large", ratio: 4.62, aa: true, aaa: true },
  ],
} as const;
