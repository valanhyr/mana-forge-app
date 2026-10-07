/// <reference types="vite/client" />

/**
 * Injected at build time from `package.json` by `define` in vite.config.ts.
 * Keeps the reported app version in Faro in sync with the release version,
 * so telemetry is attributable to the build that produced it.
 */
declare const __APP_VERSION__: string;