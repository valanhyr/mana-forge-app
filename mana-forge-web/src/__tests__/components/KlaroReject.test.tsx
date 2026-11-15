import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import { LanguageProvider } from '../../services/LanguageContext';
import { setAnalyticsConsent } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', () => ({ setAnalyticsConsent: vi.fn() }));

describe('Klaro rejects invalid consent', () => {
  it('does not trust a non-boolean stored value and allows explicit rejection', async () => {
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
    localStorage.setItem('mana_forge_klaro', encodeURIComponent(JSON.stringify({ googleAnalytics: 'true' })));
    const user = userEvent.setup();
    render(<MemoryRouter><LanguageProvider><KlaroConsent /></LanguageProvider></MemoryRouter>);
    expect(setAnalyticsConsent).not.toHaveBeenCalledWith(true);
    await user.click(await screen.findByRole('button', { name: 'Rechazar todas' }));
    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(false));
    const saved = localStorage.getItem('mana_forge_klaro');
    expect(saved).not.toBeNull();
    expect(JSON.parse(decodeURIComponent(saved!))).toEqual({ googleAnalytics: false });
  });
});
