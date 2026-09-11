// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Static output. No server, no framework runtime — interactive pieces are
  // small vanilla islands.
  // Served under /field-guide/ by the single Vercel project at the repo root.
  // Astro rewrites asset URLs for this, but NOT hrefs you author by hand —
  // those go through src/lib/path.ts. scripts/links-check.mjs proves it.
  base: "/field-guide",
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  devToolbar: { enabled: false },
  vite: {
    build: {
      rollupOptions: {
        // Pagefind writes its own bundle into dist/ after Astro finishes, so
        // it cannot be resolved at build time. The import is guarded in a
        // try/catch — a missing index degrades to card-only search.
        external: ["/field-guide/pagefind/pagefind.js"],
      },
    },
  },
});
