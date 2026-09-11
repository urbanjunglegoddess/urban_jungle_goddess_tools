// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Served under /layout-lab/ by the single Vercel project at the repo root.
  // Astro rewrites asset URLs for this, but NOT hrefs you author by hand —
  // those go through src/lib/path.ts. scripts/links-check.mjs proves it.
  base: "/layout-lab",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  devToolbar: { enabled: false },
});
