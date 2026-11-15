import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DeckAnalyzerSection from '../../../components/home/DeckAnalyzerSection';
import { LanguageProvider } from '../../../services/LanguageContext';
import { ToastProvider } from '../../../services/ToastContext';
import { DeckService } from '../../../services/DeckService';
import { setAnalyticsConsent } from '../../../services/AnalyticsService';

vi.mock('../../../services/UserContext', () => ({ useUser: () => ({ isAuthenticated: false, isSessionLoading: false }) }));
vi.mock('../../../hooks/useAnalysisQuota', () => ({ useAnalysisQuota: () => ({ quota: null, setQuota: vi.fn() }) }));
vi.mock('../../../config/turnstile', () => ({ isTurnstileConfigured: () => false }));
vi.mock('../../../services/CardService', () => ({ CardService: { batchSearch: vi.fn().mockResolvedValue({}) } }));
vi.mock('../../../services/DeckService', () => ({ DeckService: { analyzeDeck: vi.fn() } }));

const events = () => ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
  .filter((entry) => entry[0] === 'event').map((entry) => Array.from(entry));

describe('analysis consent changes', () => {
  it('does not send a result after consent is withdrawn during a request', async () => {
    localStorage.setItem('app_locale', 'es');
    let resolve!: (value: { general_summary: string }) => void;
    vi.mocked(DeckService.analyzeDeck).mockReturnValue(new Promise((done) => { resolve = done; }));
    setAnalyticsConsent(true);
    document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com/gtag/js"]')?.dispatchEvent(new Event('load'));
    render(<MemoryRouter><LanguageProvider><ToastProvider>
      <DeckAnalyzerSection formats={[{ mongoId: 'fmt-1', title: 'Premodern' }]} />
    </ToastProvider></LanguageProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('fmt-1'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '40 Private card name' } });
    await userEvent.setup().click(screen.getByRole('button', { name: /analizar mi mazo/i }));
    await waitFor(() => expect(events().some((event) => event[1] === 'ai_analysis_started')).toBe(true));
    setAnalyticsConsent(false);
    resolve({ general_summary: 'Private result' });
    await screen.findByText('Private result');
    expect(events().some((event) => event[1] === 'ai_analysis_finished')).toBe(false);
    expect(JSON.stringify(events())).not.toMatch(/Private card name|Private result/);
  });
});
