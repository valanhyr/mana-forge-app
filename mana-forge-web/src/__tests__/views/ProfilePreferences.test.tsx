import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../../views/profile/Profile';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { AuthService } from '../../services/AuthService';
import { DeckService } from '../../services/DeckService';

const account = vi.hoisted(() => ({ user: { userId: 'u1', name: 'Customer', username: 'customer', email: 'user@example.com', biography: '', friends: [], avatar: 'ava1.jpg', newsletterSubscribed: false }, updateUser: vi.fn(), logout: vi.fn() }));
vi.mock('../../services/UserContext', () => ({ useUser: () => ({ ...account, isAuthenticated: true }) }));

describe('Persisted profile preferences', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es'); account.updateUser.mockReset();
    vi.spyOn(DeckService, 'getAnalysisQuota').mockResolvedValue({ limit: 25, remaining: 18, authenticated: true, resetsAt: '2026-10-10T00:00:00Z' });
  });
  const open = async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><ToastProvider><MemoryRouter><Profile /></MemoryRouter></ToastProvider></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: /preferencias/i }));
    return user;
  };
  it('does not assume consent and saves it through the API', async () => {
    const save = vi.spyOn(AuthService, 'setNewsletterPreference').mockResolvedValue({ subscribed: true });
    const user = await open();
    const checkbox = screen.getByRole('checkbox'); expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    await waitFor(() => expect(save).toHaveBeenCalledWith(true));
    expect(account.updateUser).toHaveBeenCalledWith(expect.objectContaining({ newsletterSubscribed: true }));
    expect(screen.getByText('Te quedan 18 de 25 análisis hoy.')).toBeInTheDocument();
  });
  it('does not claim that a failed preference was saved', async () => {
    vi.spyOn(AuthService, 'setNewsletterPreference').mockRejectedValue(new Error('Unavailable'));
    const user = await open(); await user.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('checkbox')).toBeEnabled());
    expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(account.updateUser).not.toHaveBeenCalled();
  });
});
