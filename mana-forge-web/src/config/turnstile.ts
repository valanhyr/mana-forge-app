/**
 * Cloudflare Turnstile configuration.
 *
 * The site key is public by design — Cloudflare renders it into every widget
 * instance. Only the secret key protects anything, and that never leaves the API.
 *
 * Kept in its own module so `TurnstileWidget.tsx` only exports a component
 * (required by react-refresh) and so consumers can check "is Turnstile
 * configured?" without importing the widget.
 */
export const TURNSTILE_SITE_KEY: string | undefined =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;

/** True when the challenge is available and anonymous callers must pass it. */
export const isTurnstileConfigured = (): boolean => Boolean(TURNSTILE_SITE_KEY);