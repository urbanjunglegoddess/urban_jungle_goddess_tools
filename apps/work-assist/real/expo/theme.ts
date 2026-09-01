/** Afro-Futurist palette — the same tokens the web build uses, as plain values for StyleSheet. */
export const T = {
  bg: "#0A0A0A",
  bg2: "#071E15",
  panel: "#042F1E",
  panel2: "#073D26",
  line: "#0D5E39",
  gold: "#F2B01E",
  goldDeep: "#E1A443",
  cream: "#F7DFC0",
  sage: "#A8A5A0",
  sageDim: "#90958A",
  work: "#2E6B4F",
  workLo: "#0D5E39",
  break: "#E1A443",
  spare: "#587156",
  clay: "#E28D1F",
  ink: "#0A0A0A",
} as const;

export type Theme = typeof T;
