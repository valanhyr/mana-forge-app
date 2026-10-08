import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import Unsubscribe from '../../views/newsletter/Unsubscribe';
import { LanguageProvider } from '../../services/LanguageContext';
import { AuthService } from '../../services/AuthService';

describe('Newsletter unsubscribe link', () => {
  it('does not unsubscribe on page load and keeps the fragment token under StrictMode', async () => {
    localStorage.setItem('app_locale', 'es');
    window.history.replaceState(null, '', '/newsletter/unsubscribe#opaque-token');
    const unsubscribe = vi.spyOn(AuthService, 'unsubscribeNewsletter').mockResolvedValue();
    render(<StrictMode><LanguageProvider><Unsubscribe /></LanguageProvider></StrictMode>);
    expect(window.location.hash).toBe(''); expect(unsubscribe).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Confirmar baja' }));
    expect(unsubscribe).toHaveBeenCalledWith('opaque-token');
    expect(await screen.findByRole('status')).toHaveTextContent('Baja procesada');
  });
});
