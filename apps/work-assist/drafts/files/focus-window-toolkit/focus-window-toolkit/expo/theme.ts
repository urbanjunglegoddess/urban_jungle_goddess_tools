/** Afro-Futurist palette — the same tokens the web build uses, as plain values for StyleSheet. */
export const T = {
  bg: "#0a1710",
  bg2: "#0e1f16",
  panel: "#12241a",
  panel2: "#162c20",
  line: "#254234",
  gold: "#e8c86a",
  goldDeep: "#d4af37",
  cream: "#f3ead6",
  sage: "#8fae97",
  sageDim: "#6a8873",
  work: "#2f7d52",
  workLo: "#1f5c3b",
  break: "#d4af37",
  spare: "#3a4a40",
  clay: "#c47a45",
  ink: "#1c1405",
} as const;

export type Theme = typeof T;
