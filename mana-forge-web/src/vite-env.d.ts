/// <reference types="vite/client" />

/**
 * Injected at build time from `package.json` by `define` in vite.config.ts.
 * Keeps the app version in sync with the release version. Faro is disabled.
 */
declare const __APP_VERSION__: string;
