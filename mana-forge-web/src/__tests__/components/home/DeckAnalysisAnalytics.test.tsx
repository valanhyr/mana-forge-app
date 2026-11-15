import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DeckAnalyzerSection from '../../../components/home/DeckAnalyzerSection';
import { LanguageProvider } from '../../../services/LanguageContext';
import { ToastProvider } from '../../../services/ToastContext';
import { DeckService } from '../../../services/DeckService';
import { trackAnalysisStarted, trackAnalysisFinished } from '../../../services/AnalyticsService';

const session = vi.hoisted(() => ({ isAuthenticated: false, isSessionLoading: false }));
vi.mock('../../../services/UserContext', () => ({ useUser: () => session }));
vi.mock('../../../hooks/useAnalysisQuota', () => ({ useAnalysisQuota: () => ({ quota: null, setQuota: vi.fn() }) }));
vi.mock('../../../config/turnstile', () => ({ isTurnstileConfigured: () => false }));
vi.mock('../../../services/CardService', () => ({ CardService: { batchSearch: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../../services/DeckService', () => ({ DeckService: { analyzeDeck: vi.fn(), getAnalysisQuota: vi.fn() } }));
vi.mock('../../../services/AnalyticsService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/AnalyticsService')>()),
  trackAnalysisStarted: vi.fn(),
  trackAnalysisFinished: vi.fn(),
}));

const renderAnalyzer = () => render(
  <MemoryRouter><LanguageProvider><ToastProvider>
    <DeckAnalyzerSection formats={[{ mongoId: 'fmt-1', title: 'Premodern' }]} />
  </ToastProvider></LanguageProvider></MemoryRouter>
);

async function submit() {
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('fmt-1'));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '40 Lightning Bolt' } });
  const button = screen.getByRole('button', { name: /analizar mi mazo/i });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.setup().click(button);
}

describe('homepage analysis analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('app_locale', 'es');
    session.isAuthenticated = false;
    session.isSessionLoading = false;
  });

  it('keeps the initial guest classification even when the session changes before the result', async () => {
    let resolve!: (value: { general_summary: string }) => void;
    vi.mocked(DeckService.analyzeDeck).mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = renderAnalyzer();
    await submit();
    await waitFor(() => expect(trackAnalysisStarted).toHaveBeenCalledExactlyOnceWith('guest', 'home'));
    session.isAuthenticated = true;
    view.rerender(<MemoryRouter><LanguageProvider><ToastProvider>
      <DeckAnalyzerSection formats={[{ mongoId: 'fmt-1', title: 'Premodern' }]} />
    </ToastProvider></LanguageProvider></MemoryRouter>);
    resolve({ general_summary: 'Análisis' });
    await waitFor(() => expect(trackAnalysisFinished).toHaveBeenCalledExactlyOnceWith('guest', 'home', { general_summary: 'Análisis' }));
  });

  it('reports an unknown session while it is loading and records request errors once', async () => {
    session.isSessionLoading = true;
    vi.mocked(DeckService.analyzeDeck).mockRejectedValue({ response: { status: 429 } });
    vi.mocked(DeckService.getAnalysisQuota).mockResolvedValue(null);
    renderAnalyzer();
    await submit();
    await waitFor(() => expect(trackAnalysisStarted).toHaveBeenCalledExactlyOnceWith('unknown', 'home'));
    await waitFor(() => expect(trackAnalysisFinished).toHaveBeenCalledExactlyOnceWith('unknown', 'home', null));
  });

  it('passes an authenticated fallback result to the classifier', async () => {
    session.isAuthenticated = true;
    const result = { fallback: 'latest_public_deck' };
    vi.mocked(DeckService.analyzeDeck).mockResolvedValue(result as never);
    renderAnalyzer();
    await submit();
    await waitFor(() => expect(trackAnalysisStarted).toHaveBeenCalledExactlyOnceWith('authenticated', 'home'));
    await waitFor(() => expect(trackAnalysisFinished).toHaveBeenCalledExactlyOnceWith('authenticated', 'home', result));
  });
});
