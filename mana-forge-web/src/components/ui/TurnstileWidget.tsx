import { useEffect, useRef } from 'react';

import { TURNSTILE_SITE_KEY } from '../../config/turnstile';

/**
 * Minimal Cloudflare Turnstile integration.
 *
 * The widget renders itself when a token is issued (managed mode) and calls
 * `onToken` with a short-lived proof token. The backend MUST verify that token
 * against the siteverify endpoint — a token that never leaves the browser is
 * worthless, so this component is only the client half of the check.
 *
 * The script is loaded once per page and shared between mounts.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

/**
 * Upper bound on how long we wait for the Turnstile script.
 *
 * A site key that Cloudflare rejects on this hostname (the usual cause when
 * testing on localhost with production keys) makes the script hang instead of
 * firing `onerror`. Without this timeout the challenge would silently never
 * appear and the user would face a permanently disabled button.
 */
const SCRIPT_TIMEOUT_MS = 8000;

const loadTurnstileScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;

    const fail = (reason: string) => {
      clearTimeout(timer);
      script.remove();
      reject(new Error(reason));
    };

    const timer = setTimeout(
      () => fail('Cloudflare Turnstile script timed out'),
      SCRIPT_TIMEOUT_MS
    );

    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) {
        resolve();
      } else {
        // Loaded, but the API never appeared: the key was rejected upstream.
        fail('Cloudflare Turnstile loaded without exposing window.turnstile');
      }
    };
    script.onerror = () => fail('Failed to load Cloudflare Turnstile script');

    document.head.appendChild(script);
  });

  // Do not cache a failed attempt forever: a transient network error would
  // otherwise disable the challenge for the rest of the session.
  scriptPromise.catch(() => {
    scriptPromise = null;
  });

  return scriptPromise;
};

interface TurnstileWidgetProps {
  /** Called with the verification token when the challenge is solved. */
  onToken: (token: string) => void;
  /** Called on expiry/error so the parent can re-arm or surface a message. */
  onError?: () => void;
  /** Invisible mode runs the challenge without showing UI. */
  invisible?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  onToken,
  onError,
  invisible = false,
  theme = 'dark',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  // Keep callbacks fresh without tearing down the widget on every render.
  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          size: invisible ? 'invisible' : 'normal',
          callback: (token: string) => onTokenRef.current(token),
          'error-callback': () => onErrorRef.current?.(),
          'expired-callback': () => onTokenRef.current(''),
        });
      })
      .catch(() => onErrorRef.current?.());

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [invisible, theme]);

  if (!TURNSTILE_SITE_KEY) return null;

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />;
};

export default TurnstileWidget;