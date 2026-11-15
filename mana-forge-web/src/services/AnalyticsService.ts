import type { Locale } from './LanguageContext';

const MEASUREMENT_ID = 'G-YR4GEC9XWL';
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;
const SAFE_PAGE_TITLE = 'Mana Forge';
const STATIC_ROUTES = new Set([
  '/', '/login', '/verify-email', '/formats/all-formats', '/explorer', '/contact',
  '/newsletter/unsubscribe', '/my-decks', '/deck-builder', '/profile', '/friends',
  '/messages', '/messages/support',
]);
const DYNAMIC_ROUTES: Array<[RegExp, string]> = [
  [/^\/formats\/[^/]+$/, '/formats/:formatName'],
  [/^\/articles\/[^/]+$/, '/articles/:articleId'],
  [/^\/legal\/[^/]+$/, '/legal/:slug'],
  [/^\/deck-viewer\/[^/]+$/, '/deck-viewer/:deckId'],
  [/^\/deck-builder\/[^/]+$/, '/deck-builder/:deckId'],
  [/^\/messages\/support\/[^/]+$/, '/messages/support/:ticketId'],
  [/^\/messages\/[^/]+$/, '/messages/:friendId'],
];

function safePagePath(path: string): string {
  const pathname = (path.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '') || '/';
  if (STATIC_ROUTES.has(pathname)) return pathname;
  return DYNAMIC_ROUTES.find(([pattern]) => pattern.test(pathname))?.[1] ?? '/other';
}

type AnalyticsWindow = Window & {
  dataLayer?: IArguments[];
  gtag?: (...args: unknown[]) => void;
  [key: `ga-disable-${string}`]: unknown;
};

let consent = false;
let ready = false;
let script: HTMLScriptElement | null = null;
let currentNavigation = window.location.pathname;
let currentPage = safePagePath(currentNavigation);
let lastNavigation: string | null = null;

const analyticsWindow = () => window as unknown as AnalyticsWindow;

function send(...args: unknown[]) {
  if (!consent || !ready || typeof analyticsWindow().gtag !== 'function') return;
  try {
    analyticsWindow().gtag?.(...args);
  } catch {
    // Analytics must not interfere with the application.
  }
}

function sendCurrentPage() {
  if (!consent || !ready || lastNavigation === currentNavigation) return;
  lastNavigation = currentNavigation;
  const pageLocation = window.location.origin + currentPage;
  let pageReferrer = '';
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      pageReferrer = referrer.origin === window.location.origin
        ? referrer.origin + safePagePath(referrer.pathname)
        : referrer.origin;
    }
  } catch {
    // Omit an invalid referrer instead of forwarding it.
  }
  send('config', MEASUREMENT_ID, {
    send_page_view: false, page_location: pageLocation,
    page_path: currentPage, page_title: SAFE_PAGE_TITLE, page_referrer: pageReferrer,
  });
  send('event', 'page_view', {
    page_path: currentPage, page_location: pageLocation, page_title: SAFE_PAGE_TITLE,
  });
}

function clearAnalyticsCookies() {
  const hostParts = window.location.hostname.split('.');
  const domains = hostParts.map((_, index) => hostParts.slice(index).join('.'));
  for (const entry of document.cookie.split(';')) {
    const name = entry.trim().split('=')[0];
    if (!/^_(ga(?:_.+)?|gid|gat(?:_.+)?)$/.test(name)) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; SameSite=Lax`;
    }
  }
}

function loadGoogleTag() {
  if (script || ready) return;
  const target = analyticsWindow();
  target.dataLayer ??= [];
  const element = document.createElement('script');
  script = element;
  element.async = true;
  element.referrerPolicy = 'origin';
  element.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  element.onload = () => {
    if (!consent || script !== element) return;
    ready = true;
    target.gtag ??= function () {
      // Google tag expects the arguments object, not a rest-parameter array.
      // eslint-disable-next-line prefer-rest-params
      target.dataLayer?.push(arguments);
    };
    send('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    send('consent', 'update', { analytics_storage: 'granted' });
    send('js', new Date());
    sendCurrentPage();
  };
  element.onerror = () => {
    if (script === element) script = null;
    element.remove();
  };
  document.head.appendChild(element);
}

export function setAnalyticsConsent(granted: boolean) {
  if (!granted) {
    consent = false;
    analyticsWindow()[DISABLE_KEY] = true;
    lastNavigation = null;
    if (!ready && script) {
      script.remove();
      script = null;
    }
    try {
      clearAnalyticsCookies();
    } catch {
      // Some browser contexts deny cookie access; tracking still remains disabled.
    }
    return;
  }
  if (consent) return;
  consent = true;
  analyticsWindow()[DISABLE_KEY] = false;
  if (ready) sendCurrentPage();
  else {
    try {
      loadGoogleTag();
    } catch {
      consent = false;
      analyticsWindow()[DISABLE_KEY] = true;
    }
  }
}

export function trackPageView(path: string) {
  currentNavigation = path.split(/[?#]/, 1)[0] || '/';
  currentPage = safePagePath(currentNavigation);
  sendCurrentPage();
}

export function trackFaqOpen(topicCode: string, faqCode: string, language: Locale) {
  send('event', 'faq_open', { faq_code: faqCode, faq_topic: topicCode, faq_language: language });
}

export type AnalyticsUserType = 'guest' | 'authenticated' | 'unknown';
export type AnalysisScreen = 'home' | 'deck_builder';

export function analyticsUserType(isSessionLoading: boolean, isAuthenticated: boolean): AnalyticsUserType {
  if (isSessionLoading || typeof isAuthenticated !== 'boolean') return 'unknown';
  return isAuthenticated ? 'authenticated' : 'guest';
}

function validUserType(userType: AnalyticsUserType): boolean {
  return userType === 'guest' || userType === 'authenticated' || userType === 'unknown';
}

function validAnalysisScreen(screen: AnalysisScreen): boolean {
  return screen === 'home' || screen === 'deck_builder';
}

export function trackDeckCreated(userType: AnalyticsUserType) {
  if (validUserType(userType)) {
    send('event', 'deck_created', { user_type: userType, app_screen: 'deck_builder' });
  }
}

export function trackDeckCloned(userType: AnalyticsUserType) {
  if (validUserType(userType)) {
    send('event', 'deck_cloned', { user_type: userType, app_screen: 'deck_viewer' });
  }
}

export function trackAnalysisStarted(userType: AnalyticsUserType, screen: AnalysisScreen) {
  if (validUserType(userType) && validAnalysisScreen(screen)) {
    send('event', 'ai_analysis_started', { user_type: userType, app_screen: screen });
  }
}

function analysisStatus(result: unknown): 'success' | 'fallback' | 'error' {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return 'error';
  const data = result as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(data, 'fallback')) {
    return typeof data.fallback === 'string' && data.fallback.trim() ? 'fallback' : 'error';
  }
  if (Object.prototype.hasOwnProperty.call(data, 'error')) return 'error';
  return typeof data.general_summary === 'string' && data.general_summary.trim() ? 'success' : 'error';
}

export function trackAnalysisFinished(userType: AnalyticsUserType, screen: AnalysisScreen, result: unknown) {
  if (validUserType(userType) && validAnalysisScreen(screen)) {
    send('event', 'ai_analysis_finished', {
      user_type: userType, app_screen: screen, analysis_status: analysisStatus(result),
    });
  }
}
