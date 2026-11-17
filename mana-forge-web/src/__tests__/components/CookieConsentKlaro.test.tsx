import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import KlaroConsent from '../../components/ui/KlaroConsent';
import { LanguageProvider } from '../../services/LanguageContext';
import { setAnalyticsConsent } from '../../services/AnalyticsService';

vi.mock('../../services/AnalyticsService', () => ({ setAnalyticsConsent: vi.fn() }));

describe('Klaro consent', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem('app_locale', 'es');
  });

  it('requires a new choice, then applies and withdraws Google consent', async () => {
    localStorage.setItem('cookie_consent', JSON.stringify({ statistics: true }));
    const user = userEvent.setup();
    const onConsentResolved = vi.fn();
    render(<MemoryRouter><LanguageProvider><KlaroConsent onConsentResolved={onConsentResolved} /></LanguageProvider></MemoryRouter>);

    const accept = await screen.findByRole('button', { name: 'Aceptar todas' });
    expect(setAnalyticsConsent).not.toHaveBeenCalledWith(true);
    expect(onConsentResolved).toHaveBeenLastCalledWith(false);
    await user.click(accept);
    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(true));
    expect(onConsentResolved).toHaveBeenLastCalledWith(true);
    expect(localStorage.getItem('mana_forge_klaro')).not.toBeNull();

    localStorage.setItem('mana_forge_klaro', encodeURIComponent(JSON.stringify({ googleAnalytics: false })));
    window.dispatchEvent(new StorageEvent('storage', { key: 'mana_forge_klaro' }));
    expect(setAnalyticsConsent).toHaveBeenLastCalledWith(false);
    localStorage.setItem('mana_forge_klaro', encodeURIComponent(JSON.stringify({ googleAnalytics: true })));
    window.dispatchEvent(new StorageEvent('storage', { key: 'mana_forge_klaro' }));
    expect(setAnalyticsConsent).toHaveBeenLastCalledWith(true);

    const manage = screen.getByRole('button', { name: 'Gestionar consentimiento' });
    await user.click(manage);
    const dialog = await screen.findByRole('dialog', { name: 'Preferencias de privacidad' });
    expect(dialog).toHaveTextContent('creación y duplicación de mazos y uso del análisis de IA');
    expect(dialog).toHaveTextContent('inicios de sesión, registros, verificaciones de correo, envíos de contacto, copias de listas y errores de uso');
    screen.getByRole('button', { name: 'Cerrar' }).focus();
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement);
    await user.click(await screen.findByRole('checkbox', { name: 'Google Analytics' }));
    await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }));
    await waitFor(() => expect(setAnalyticsConsent).toHaveBeenLastCalledWith(false));
    await waitFor(() => expect(manage).toHaveFocus());

    await user.click(manage);
    expect(await screen.findByRole('dialog', { name: 'Preferencias de privacidad' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(manage).toHaveFocus());
  });
});
