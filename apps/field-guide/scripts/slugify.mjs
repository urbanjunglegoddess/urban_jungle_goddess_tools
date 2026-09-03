/**
 * Stable, collision-free slug for a platform name.
 *
 * Punctuation that carries meaning is spelled out rather than dropped, so
 * "WordPress + Bricks" and "WordPress Bricks" could never collapse into the
 * same URL. Shared by the migration and the parity check — the check must not
 * import the migration, or running the test would rewrite the content it tests.
 */
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/&/g, " and ")
    .replace(/\./g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
