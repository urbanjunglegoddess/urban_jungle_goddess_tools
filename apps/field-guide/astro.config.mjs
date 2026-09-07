// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  // Static output. No server, no framework runtime — interactive pieces are
  // small vanilla islands.
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  devToolbar: { enabled: false },
});
