// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Static output. No server, no framework runtime — interactive pieces are
  // small vanilla islands.
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
        external: ["/pagefind/pagefind.js"],
      },
    },
  },
});
