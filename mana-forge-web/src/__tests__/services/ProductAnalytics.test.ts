import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleScript = () => document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]');
const events = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .map((args) => Array.from(args)).filter((entry) => entry[0] === 'event');

describe('product analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    sessionStorage.clear();
    document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach((el) => el.remove());
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it('sends only the approved events and parameters while consented and ready', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackRegistrationStarted();
    analytics.trackLocalSignUp();
    analytics.trackEmailVerification();
    analytics.trackLogin('local');
    analytics.trackContactSubmitted();
    analytics.trackContactSubmitFailed();
    analytics.trackDeckListCopied();
    analytics.trackDeckSaveFailed();
    analytics.trackPageNotFound();
    expect(events()).toEqual([]);

    analytics.setAnalyticsConsent(true);
    analytics.trackLocalSignUp(); // Google has not loaded: do not replay.
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackRegistrationStarted();
    analytics.trackLocalSignUp();
    analytics.trackEmailVerification();
    analytics.trackLogin('local');
    analytics.trackLogin('private-user-id' as never);
    analytics.trackContactSubmitted();
    analytics.trackContactSubmitFailed();
    analytics.trackDeckListCopied();
    analytics.trackDeckSaveFailed();
    analytics.trackPageNotFound();
    expect(events().filter((entry) => entry[1] !== 'page_view')).toEqual([
      ['event', 'registration_started', {}],
      ['event', 'sign_up', { method: 'local' }],
      ['event', 'email_verification_completed', {}],
      ['event', 'login', { method: 'local' }],
      ['event', 'contact_submitted', {}],
      ['event', 'contact_submit_failed', {}],
      ['event', 'deck_list_copied', {}],
      ['event', 'deck_save_failed', {}],
      ['event', 'page_not_found', {}],
    ]);
    analytics.setAnalyticsConsent(false);
    const count = events().length;
    analytics.trackContactSubmitted();
    analytics.trackLogin('local');
    expect(events()).toHaveLength(count);
  });

  it('only marks an explicit Google login with consent and consumes it once after confirmed session', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.startGoogleLoginTracking(false, false);
    expect(sessionStorage.length).toBe(0);
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.startGoogleLoginTracking(true, false);
    analytics.startGoogleLoginTracking(false, true);
    expect(sessionStorage.length).toBe(0);
    analytics.startGoogleLoginTracking(false, false);
    expect(sessionStorage.length).toBe(1);
    analytics.finishGoogleLoginTracking(true);
    analytics.finishGoogleLoginTracking(true);
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([['event', 'login', { method: 'google' }]]);
    expect(sessionStorage.length).toBe(0);
  });

  it('discards failed, expired and withdrawn Google markers without replaying them', async () => {
    const analytics = await import('../../services/AnalyticsService');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.startGoogleLoginTracking(false, false);
    analytics.finishGoogleLoginTracking(false);
    analytics.finishGoogleLoginTracking(true);
    analytics.startGoogleLoginTracking(false, false);
    clock.mockReturnValue(1_000_000 + 5 * 60_000 + 1);
    analytics.finishGoogleLoginTracking(true);
    analytics.startGoogleLoginTracking(false, false);
    analytics.setAnalyticsConsent(false);
    expect(sessionStorage.length).toBe(0);
    analytics.setAnalyticsConsent(true);
    analytics.finishGoogleLoginTracking(true);
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([]);
  });

  it('drops the Google return if the tag is not ready and tolerates blocked session storage', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.setAnalyticsConsent(true);
    analytics.startGoogleLoginTracking(false, false);
    analytics.finishGoogleLoginTracking(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.finishGoogleLoginTracking(true);
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => analytics.startGoogleLoginTracking(false, false)).not.toThrow();
    expect(() => analytics.finishGoogleLoginTracking(true)).not.toThrow();
  });

  it('recognizes a same-tab Google return after a fresh page load with restored consent', async () => {
    const beforeRedirect = await import('../../services/AnalyticsService');
    beforeRedirect.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    beforeRedirect.startGoogleLoginTracking(false, false);

    vi.resetModules();
    document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach((el) => el.remove());
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    delete (window as unknown as { gtag?: unknown }).gtag;
    const afterRedirect = await import('../../services/AnalyticsService');
    afterRedirect.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    afterRedirect.finishGoogleLoginTracking(true);
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([['event', 'login', { method: 'google' }]]);
  });

  it('discards the pending Google marker on cancellation', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.startGoogleLoginTracking(false, false);
    analytics.cancelGoogleLoginTracking();
    analytics.finishGoogleLoginTracking(true);
    expect(sessionStorage.length).toBe(0);
    expect(events().filter((entry) => entry[1] === 'login')).toEqual([]);
  });
});
