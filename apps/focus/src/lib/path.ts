/**
 * Internal links, prefixed with this app's base path.
 *
 * All four apps ship from one Vercel project, each under its own prefix —
 * /field-guide, /focus, /layout-lab, and the home page at the root. Astro's
 * `base` setting rewrites asset URLs on its own, but an href you typed by hand
 * is just a string and stays exactly as written. So every internal link goes
 * through here.
 *
 * Deliberately not shared between apps: it is four lines, and each app resolves
 * its own BASE_URL. A package would add a dependency edge for nothing.
 * scripts/links-check.mjs walks the assembled site and proves no link was
 * missed, which is the guarantee that actually matters.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * path("/about") -> "/focus/about", path("/") -> "/focus".
 *
 * The trailing slash is stripped because every app sets trailingSlash: "never"
 * — without that, a link home from inside an app came out as "/focus/" while
 * every other link to the same page came out as "/focus". Both resolve; only
 * one of them is the canonical URL, and two spellings of one page is how you
 * end up with a split in analytics and a redirect nobody meant to configure.
 */
export const path = (p: string): string => (BASE + p).replace(/\/$/, "") || "/";
