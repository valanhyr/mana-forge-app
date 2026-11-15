import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import { LanguageProvider } from '../../services/LanguageContext';
import { setAnalyticsConsent } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', () => ({ setAnalyticsConsent: vi.fn() }));

describe('saved Klaro consent', () => {
  it('restores a valid saved choice and renders the settings in English', async () => {
    localStorage.clear();
    localStorage.setItem('app_locale', 'en');
    localStorage.setItem('mana_forge_klaro', encodeURIComponent(JSON.stringify({ googleAnalytics: true })));
    render(<MemoryRouter><LanguageProvider><KlaroConsent /></LanguageProvider></MemoryRouter>);
    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(true));
    expect(screen.queryByRole('button', { name: 'Accept all' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Consent' })).toBeInTheDocument();
  });
});
