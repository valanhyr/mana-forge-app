import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleScript = () => document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]');
const commands = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .map((args) => Array.from(args));

describe('consent-aware analytics', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach((el) => el.remove());
    delete (window as unknown as { dataLayer?: unknown }).dataLayer;
    delete (window as unknown as { gtag?: unknown }).gtag;
    delete (window as unknown as Record<string, unknown>)['ga-disable-G-YR4GEC9XWL'];
  });

  it('does not load Google or buffer events without consent', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/before');
    analytics.trackFaqOpen('general', 'first', 'es');
    expect(googleScript()).toBeNull();
    expect(commands()).toEqual([]);
  });

  it('loads once after acceptance, sends current page and FAQ codes, and stops on withdrawal', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/contact');
    analytics.trackFaqOpen('general', 'before', 'es');
    analytics.trackPageView('/explorer');
    analytics.setAnalyticsConsent(true);
    analytics.setAnalyticsConsent(true);
    const script = googleScript();
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
    expect(script).not.toBeNull();
    expect(script?.referrerPolicy).toBe('origin');
    script?.dispatchEvent(new Event('load'));
    analytics.trackFaqOpen('general', 'what-can-i-do', 'es');
    const sent = commands();
    expect(sent).toContainEqual(['event', 'page_view', expect.objectContaining({ page_path: '/explorer' })]);
    expect(sent).toContainEqual(['event', 'faq_open', {
      faq_code: 'what-can-i-do', faq_topic: 'general', faq_language: 'es',
    }]);
    expect(JSON.stringify(sent)).not.toContain('before');
    expect(JSON.stringify(sent)).not.toContain('/contact');
    analytics.setAnalyticsConsent(false);
    const count = commands().length;
    analytics.trackFaqOpen('general', 'after', 'en');
    analytics.trackPageView('/after');
    expect(commands()).toHaveLength(count);
    expect((window as unknown as Record<string, unknown>)['ga-disable-G-YR4GEC9XWL']).toBe(true);
  });

  it('does not initialize if consent is withdrawn while Google is loading', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/');
    analytics.setAnalyticsConsent(true);
    const script = googleScript();
    analytics.setAnalyticsConsent(false);
    script?.dispatchEvent(new Event('load'));
    expect(commands()).toEqual([]);
    expect(googleScript()).toBeNull();
  });

  it('does not send URL query strings or fragments that may contain tokens', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/verify-email?token=secret-value#private');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackFaqOpen('general', 'first', 'es');
    expect(JSON.stringify(commands())).not.toContain('secret-value');
    expect(commands()).toContainEqual(['event', 'page_view', expect.objectContaining({ page_path: '/verify-email' })]);
  });

  it('uses route templates and a safe title instead of deck identifiers or user-supplied titles', async () => {
    const analytics = await import('../../services/AnalyticsService');
    document.title = 'Private Deck Name';
    analytics.trackPageView('/deck-viewer/deck-secret?token=secret-value');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    const sent = commands();
    expect(sent).toContainEqual(['event', 'page_view', expect.objectContaining({
      page_path: '/deck-viewer/:deckId', page_title: 'Mana Forge',
    })]);
    expect(JSON.stringify(sent)).not.toContain('deck-secret');
    expect(JSON.stringify(sent)).not.toContain('Private Deck Name');
    expect(JSON.stringify(sent)).not.toContain('secret-value');
  });

  it('masks dynamic routes, unrecognized routes and same-origin referrers', async () => {
    const analytics = await import('../../services/AnalyticsService');
    const referrer = vi.spyOn(document, 'referrer', 'get')
      .mockReturnValue('http://localhost:3000/messages/support/private-ticket?token=secret');
    analytics.trackPageView('/messages/private-friend');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackPageView('/deck-builder/private-deck');
    analytics.trackPageView('/unrecognized/private-value');
    const sent = commands();
    const text = JSON.stringify(sent);
    expect(text).toContain('/messages/:friendId');
    expect(text).toContain('/deck-builder/:deckId');
    expect(text).toContain('/messages/support/:ticketId');
    expect(text).toContain('/other');
    expect(text).not.toMatch(/private-ticket|private-friend|private-deck|private-value|token=secret/);
    referrer.mockRestore();
  });

  it('counts navigating between two deck pages without sending either identifier', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/deck-viewer/first-private-id');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackPageView('/deck-viewer/second-private-id');
    const pageEvents = commands().filter((entry) => entry[0] === 'event' && entry[1] === 'page_view');
    expect(pageEvents).toHaveLength(2);
    expect(pageEvents[0][2]).toMatchObject({ page_path: '/deck-viewer/:deckId' });
    expect(pageEvents[1][2]).toMatchObject({ page_path: '/deck-viewer/:deckId' });
    expect(JSON.stringify(commands())).not.toMatch(/first-private-id|second-private-id/);
  });

  it('avoids duplicate page views, clears analytics cookies and handles re-acceptance', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackPageView('/same');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackPageView('/same');
    expect(commands().filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')).toHaveLength(1);
    document.cookie = '_ga=previous; Path=/';
    analytics.setAnalyticsConsent(false);
    expect(document.cookie).not.toContain('_ga=');
    analytics.setAnalyticsConsent(true);
    expect(commands().filter((entry) => entry[0] === 'event' && entry[1] === 'page_view')).toHaveLength(2);
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });

  it('does not let a broken Google tag throw into the UI', async () => {
    const analytics = await import('../../services/AnalyticsService');
    Object.assign(window, { gtag: () => { throw new Error('blocked'); } });
    analytics.setAnalyticsConsent(true);
    expect(() => googleScript()?.dispatchEvent(new Event('load'))).not.toThrow();
    expect(() => analytics.trackFaqOpen('general', 'first', 'es')).not.toThrow();
  });

  it('classifies the frontend session without treating a loading session as a guest', async () => {
    const analytics = await import('../../services/AnalyticsService');
    expect(analytics.analyticsUserType(true, false)).toBe('unknown');
    expect(analytics.analyticsUserType(true, true)).toBe('unknown');
    expect(analytics.analyticsUserType(false, false)).toBe('guest');
    expect(analytics.analyticsUserType(false, true)).toBe('authenticated');
  });

  it('emits only consented, bounded deck and analysis events without deck data', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.trackDeckCreated('authenticated');
    analytics.trackAnalysisStarted('guest', 'home');
    expect(commands()).toEqual([]);
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    analytics.trackDeckCreated('authenticated');
    analytics.trackDeckCloned('authenticated');
    analytics.trackAnalysisStarted('guest', 'home');
    analytics.trackAnalysisFinished('guest', 'home', { general_summary: 'private deck content', cached: true });
    const sent = commands();
    expect(sent).toContainEqual(['event', 'deck_created', { user_type: 'authenticated', app_screen: 'deck_builder' }]);
    expect(sent).toContainEqual(['event', 'deck_cloned', { user_type: 'authenticated', app_screen: 'deck_viewer' }]);
    expect(sent).toContainEqual(['event', 'ai_analysis_started', { user_type: 'guest', app_screen: 'home' }]);
    expect(sent).toContainEqual(['event', 'ai_analysis_finished', {
      user_type: 'guest', app_screen: 'home', analysis_status: 'success',
    }]);
    expect(JSON.stringify(sent)).not.toContain('private deck content');
    const count = sent.length;
    analytics.setAnalyticsConsent(false);
    analytics.trackDeckCreated('authenticated');
    analytics.trackAnalysisFinished('guest', 'home', { general_summary: 'secret' });
    expect(commands()).toHaveLength(count);
  });

  it('distinguishes actual analysis results from fallbacks, errors and empty responses', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    const responses = [
      { fallback: 'random_deck', general_summary: 'not an analysis' },
      { error: 'private error text' },
      { quota: null },
      null,
      { general_summary: 'analysis', cached: true },
    ];
    for (const response of responses) analytics.trackAnalysisFinished('unknown', 'deck_builder', response);
    const events = commands().filter((entry) => entry[0] === 'event' && entry[1] === 'ai_analysis_finished');
    expect(events.map((entry) => (entry[2] as { analysis_status: string }).analysis_status))
      .toEqual(['fallback', 'error', 'error', 'error', 'success']);
    expect(JSON.stringify(events)).not.toContain('private error text');
  });

  it('refuses unexpected user types and screens instead of sending free text', async () => {
    const analytics = await import('../../services/AnalyticsService');
    analytics.setAnalyticsConsent(true);
    googleScript()?.dispatchEvent(new Event('load'));
    const count = commands().length;
    analytics.trackDeckCreated('private-user-id' as never);
    analytics.trackDeckCloned('private-user-id' as never);
    analytics.trackAnalysisStarted('guest', 'private-screen' as never);
    analytics.trackAnalysisFinished('guest', 'private-screen' as never, { general_summary: 'secret' });
    expect(commands()).toHaveLength(count);
  });
});
