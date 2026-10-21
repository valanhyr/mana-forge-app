import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';

import DeckAnalyzerSection from '../../../components/home/DeckAnalyzerSection';
import { LanguageProvider } from '../../../services/LanguageContext';
import { ToastProvider } from '../../../services/ToastContext';
import { UserProvider } from '../../../services/UserContext';

const BASE = 'http://localhost:8080';

/**
 * Turnstile is normally disabled in tests (no site key configured), so the
 * challenge block never renders. These tests need it enabled to reproduce a
 * site key that Cloudflare rejects on the current hostname, hence the mutable
 * hoisted flag.
 */
const turnstile = vi.hoisted(() => ({ configured: false }));
vi.mock('../../../config/turnstile', () => ({
  // Getters, not values: the mock factory is evaluated on first import, which
  // happens before any test sets the flag.
  get TURNSTILE_SITE_KEY() {
    return turnstile.configured ? '1x00000000000000000000AA' : undefined;
  },
  isTurnstileConfigured: () => turnstile.configured,
}));

const FORMATS = [
  { mongoId: 'fmt-1', title: 'Premodern' },
  { mongoId: 'fmt-2', title: 'Legacy' },
];

const DECK = Array.from({ length: 15 }, (_, i) => `4 Card ${i}`).join('\n');

const renderSection = () =>
  render(
    <LanguageProvider>
      <ToastProvider>
        <UserProvider>
          <MemoryRouter>
            <DeckAnalyzerSection formats={FORMATS} />
          </MemoryRouter>
        </UserProvider>
      </ToastProvider>
    </LanguageProvider>
  );

const analyzeButton = () => screen.getByRole('button', { name: /analizar mi mazo|analyze my deck/i });

describe('DeckAnalyzerSection (homepage AI trial)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Pin the locale: LanguageProvider falls back to navigator.language, which
    // makes these assertions depend on the machine running the suite.
    localStorage.setItem('app_locale', 'es');

    server.use(
      // Anonymous visitor. The global handler for /users/me returns a user,
      // which would make the component believe there is a session and hide the
      // quota counter and the sign-in calls to action.
      http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })),
      http.get(`${BASE}/decks/analyze/quota`, () =>
        HttpResponse.json({ authenticated: false, limit: 5, remaining: 3, resetsAt: null })
      ),
      http.post(`${BASE}/cards/scryfall/batch`, () => HttpResponse.json({ results: [] })),
      http.post(`${BASE}/decks/analyze`, () =>
        HttpResponse.json({
          general_summary: 'Buen mazo de aggro.',
          strengths: ['Curva eficiente'],
          weaknesses: ['Poco removal'],
          matchups: [{ archetype: 'Burn', strategy: 'Race', win_rate_pre: 45, win_rate_post: 52 }],
          suggested_changes: [{ card_out: 'Island', card_in: 'Volcanic Island', reason: 'Más maná' }],
        })
      )
    );
  });

  it('renders the section with a decklists field and a format selector', () => {
    renderSection();
    expect(screen.getByTestId('deck-analyzer')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(analyzeButton()).toBeDisabled();
  });

  it('enables the button once the pasted decklists is big enough', async () => {
    const user = userEvent.setup();
    renderSection();

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('fmt-1'));

    await user.type(screen.getByRole('textbox'), DECK.slice(0, 9));
    expect(analyzeButton()).toBeDisabled();

    await user.type(screen.getByRole('textbox'), DECK.slice(9));
    await waitFor(() => expect(analyzeButton()).toBeEnabled());
  });

  it('warns when the pasted decklists is too small to be a real deck', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(screen.getByRole('textbox'), '4 Lightning Bolt\n2 Duress');

    expect(screen.getByText(/muy pequeño|too small/i)).toBeInTheDocument();
  });

  it('shows how many analyses are left before submitting anything', async () => {
    renderSection();
    await waitFor(() =>
      expect(screen.getByText(/te quedan 3 de 5 análisis/i)).toBeInTheDocument()
    );
  });

  it('runs the analysis and renders the result modal', async () => {
    const user = userEvent.setup();
    renderSection();

    await waitFor(() => expect(analyzeButton()).toBeInTheDocument());
    await user.type(screen.getByRole('textbox'), DECK);
    await waitFor(() => expect(analyzeButton()).toBeEnabled());

    await user.click(analyzeButton());

    await waitFor(() =>
      expect(screen.getByText('Buen mazo de aggro.')).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByText('Curva eficiente')).toBeInTheDocument();
    expect(screen.getByText('Volcanic Island')).toBeInTheDocument();
  });

  it('surfaces a friendly toast when the daily limit is reached', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/decks/analyze`, () =>
        HttpResponse.json(
          { error: 'Daily analysis limit reached.', code: 'AI_QUOTA_EXCEEDED' },
          { status: 429 }
        )
      )
    );

    renderSection();
    await waitFor(() => expect(analyzeButton()).toBeInTheDocument());
    await user.type(screen.getByRole('textbox'), DECK);
    await waitFor(() => expect(analyzeButton()).toBeEnabled());
    await user.click(analyzeButton());

    await waitFor(
      () => expect(screen.getByText(/has alcanzado tu límite diario/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('surfaces a distinct message when the Turnstile challenge fails', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/decks/analyze`, () =>
        HttpResponse.json(
          { error: 'Human verification required.', code: 'TURNSTILE_FAILED' },
          { status: 403 }
        )
      )
    );

    renderSection();
    await waitFor(() => expect(analyzeButton()).toBeInTheDocument());
    await user.type(screen.getByRole('textbox'), DECK);
    await waitFor(() => expect(analyzeButton()).toBeEnabled());
    await user.click(analyzeButton());

    await waitFor(
      () => expect(screen.getByText(/verificación de seguridad ha fallado/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it('prompts anonymous visitors to sign in so they can keep using it', () => {
    renderSection();
    expect(screen.getAllByText(/inicia sesión para más|sign in for more/i).length).toBeGreaterThan(0);
  });

  it('explains the problem instead of leaving a dead button when the challenge fails to load', async () => {
    // Reproduces a site key that is not allowed on this hostname: the script
    // loads but window.turnstile never appears, so the render never completes.
    turnstile.configured = true;
    renderSection();

    await userEvent.setup().type(screen.getByRole('textbox'), DECK);

    await waitFor(
      () => expect(screen.getByText(/no hemos podido cargar la verificación/i)).toBeInTheDocument(),
      { timeout: 10000 }
    );
    // The form must stay usable rather than silently blocking the submission.
    expect(analyzeButton()).toBeEnabled();
    turnstile.configured = false;
  });
});
