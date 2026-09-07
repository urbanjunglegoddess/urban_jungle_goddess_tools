/// <reference types="astro/client" />

interface ImportMetaEnv {
  /**
   * Where the Field Guide is deployed. Set it in the Vercel project's
   * environment variables, or in a local .env. Unset is a valid state: the
   * card renders without an Open button rather than with a guessed link.
   */
  readonly PUBLIC_FIELD_GUIDE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
