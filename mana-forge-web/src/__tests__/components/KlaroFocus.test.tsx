import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import { LanguageProvider } from '../../services/LanguageContext';

vi.mock('../../services/AnalyticsService', () => ({ setAnalyticsConsent: vi.fn() }));

describe('Klaro focus restoration', () => {
  it('restores the trigger even if the browser focuses the body while removing the dialog', async () => {
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
    localStorage.setItem('mana_forge_klaro', encodeURIComponent(JSON.stringify({ googleAnalytics: false })));
    const user = userEvent.setup();
    render(<MemoryRouter><LanguageProvider><KlaroConsent /></LanguageProvider></MemoryRouter>);
    const trigger = screen.getByRole('button', { name: 'Gestionar consentimiento' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Preferencias de privacidad' });
    document.body.tabIndex = -1;
    dialog.closest('.cookie-modal')?.remove();
    document.body.focus();
    await waitFor(() => expect(trigger).toHaveFocus());
    document.body.removeAttribute('tabIndex');
  });
});
