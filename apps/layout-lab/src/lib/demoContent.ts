/**
 * The one body of copy every demo page renders.
 *
 * Meridian Six is invented. It exists so the demos have something real-shaped to
 * hold without any of them reading as a live Urban Jungle Goddess page — nothing
 * here is a claim about a client, a price, or a project.
 *
 * Sharing one set of copy across all twenty-four demos is the point: when the
 * words are fixed, the only thing that changes between two demos is the layout,
 * which is exactly the comparison the lab is for.
 */

export const BRAND = "Meridian Six";
export const BRAND_SHORT = "M6";
export const TAGLINE = "A design studio for things that have to work in public.";

export const INTRO =
  "We build identity systems, interfaces and motion for organisations whose work is watched. " +
  "Six people, one studio, no account managers.";

export const NAV = ["Work", "Studio", "Journal", "Contact"] as const;

export interface Service {
  n: string;
  title: string;
  line: string;
  body: string;
}

export const SERVICES: Service[] = [
  {
    n: "01",
    title: "Identity",
    line: "Names, marks, and the rules that keep them honest.",
    body: "A wordmark is the easy part. We write the system around it — the spacing, the voice, the things you are not allowed to do — so it still holds up two years and forty hands later.",
  },
  {
    n: "02",
    title: "Interface",
    line: "Screens people use under pressure, built to stay calm.",
    body: "Dispatch boards, intake forms, dashboards at 3am. We design for the worst ten minutes of the user's week, not the demo.",
  },
  {
    n: "03",
    title: "Motion",
    line: "Movement with a reason — never movement as decoration.",
    body: "Every transition we ship answers a question the user was already asking: where did that go, what just changed, am I still connected.",
  },
];

export interface Work {
  client: string;
  kind: string;
  year: string;
  line: string;
}

export const WORKS: Work[] = [
  { client: "Harbour Line", kind: "Identity + site", year: "2025", line: "A ferry network that finally reads like one network." },
  { client: "Nine Rivers", kind: "Interface", year: "2025", line: "Field reporting for people with one bar of signal." },
  { client: "Cold Open", kind: "Motion", year: "2024", line: "Title system for a documentary strand." },
  { client: "Verge Foundry", kind: "Identity", year: "2024", line: "A metal shop that wanted to look like a metal shop." },
  { client: "Pallas Health", kind: "Interface", year: "2024", line: "Triage screens that stop asking twice." },
  { client: "Low Tide Press", kind: "Identity + site", year: "2023", line: "Forty years of back catalogue, one shelf." },
];

export const STATS = [
  { k: "Studio size", v: "6" },
  { k: "Since", v: "2016" },
  { k: "Projects shipped", v: "94" },
  { k: "Average engagement", v: "11 weeks" },
];

export const CTA = {
  label: "Start a project",
  line: "Tell us what is going wrong. We will tell you whether we are the right shop for it.",
  address: "Unit 6, Meridian Works",
  email: "studio@meridiansix.example",
};

export const JOURNAL = [
  { title: "The brief is not the problem", date: "Aug 2025" },
  { title: "Against the hero section", date: "Jun 2025" },
  { title: "What a design system owes its maintainer", date: "Apr 2025" },
];
