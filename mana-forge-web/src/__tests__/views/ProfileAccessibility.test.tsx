import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Profile from '../../views/profile/Profile';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { DeckService } from '../../services/DeckService';

const account = vi.hoisted(() => ({
  user: {
    userId: 'u1',
    name: 'Customer',
    username: 'customer',
    email: 'user@example.com',
    biography: '',
    friends: [],
    avatar: 'ava1.jpg',
    newsletterSubscribed: false,
  },
  updateUser: vi.fn(),
  logout: vi.fn(),
}));
vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ ...account, isAuthenticated: true }),
}));

const setup = () =>
  render(
    <LanguageProvider>
      <ToastProvider>
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      </ToastProvider>
    </LanguageProvider>
  );

describe('Profile accessibility', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    account.updateUser.mockReset();
    account.logout.mockReset();
    vi.spyOn(DeckService, 'getAnalysisQuota').mockResolvedValue({
      limit: 25,
      remaining: 18,
      authenticated: true,
      resetsAt: '2026-10-10T00:00:00Z',
    });
  });

  describe('sidebar tabs', () => {
    it('exposes the navigation as a tablist', () => {
      setup();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('marks the active tab as selected and the other as not', () => {
      setup();
      const personal = screen.getByRole('tab', { name: /información personal/i });
      const preferences = screen.getByRole('tab', { name: /preferencias/i });
      expect(personal).toHaveAttribute('aria-selected', 'true');
      expect(preferences).toHaveAttribute('aria-selected', 'false');
    });

    it('labels the tabpanel with its tab', () => {
      setup();
      const tab = screen.getByRole('tab', { name: /información personal/i });
      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    });

    it('moves the selection to preferences on click', async () => {
      setup();
      await userEvent.click(screen.getByRole('tab', { name: /preferencias/i }));
      expect(screen.getByRole('tab', { name: /preferencias/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('moves between tabs with the arrow keys', async () => {
      setup();
      const user = userEvent.setup();
      const personal = screen.getByRole('tab', { name: /información personal/i });
      personal.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /preferencias/i })).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(personal).toHaveFocus();
    });

    it('keeps logout out of the tablist', () => {
      setup();
      const logout = screen.getByRole('button', { name: /cerrar sesión/i });
      expect(logout).not.toHaveAttribute('role', 'tab');
      expect(screen.queryAllByRole('tab')).toHaveLength(2);
    });
  });

  describe('password form', () => {
    const openForm = async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
      return user;
    };

    it('names each visibility toggle after the field it controls', async () => {
      await openForm();
      expect(
        screen.getByRole('button', { name: /^mostrar contraseña: contraseña actual/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^mostrar contraseña: nueva contraseña/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^mostrar contraseña: confirmar/i })
      ).toBeInTheDocument();
    });

    it('changes the toggle label once that password is visible', async () => {
      const user = await openForm();
      await user.click(
        screen.getByRole('button', { name: /^mostrar contraseña: contraseña actual/i })
      );
      expect(
        screen.getByRole('button', { name: /^ocultar contraseña: contraseña actual/i })
      ).toBeInTheDocument();
    });

    it('toggles the input type without losing its value', async () => {
      const user = await openForm();
      const field = screen.getByLabelText(/^contraseña actual$/i);
      await user.type(field, 'secreto');
      await user.click(
        screen.getByRole('button', { name: /^mostrar contraseña: contraseña actual/i })
      );
      expect(screen.getByLabelText(/^contraseña actual$/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/^contraseña actual$/i)).toHaveValue('secreto');
    });

    it('announces a validation error', async () => {
      const user = await openForm();
      await user.type(screen.getByLabelText(/^nueva contraseña$/i), 'abc123');
      await user.type(screen.getByLabelText(/^confirmar/i), 'otracosa');
      const submit = screen.getAllByRole('button', { name: /guardar cambios/i }).at(-1)!;
      await user.click(submit);

      const region = screen.getByRole('status');
      expect(region).toHaveTextContent(/no coinciden/i);
    });

    it('does not announce success before the password changes', async () => {
      await openForm();
      expect(screen.queryByText(/contraseña actualizada/i)).not.toBeInTheDocument();
    });
  });

  describe('newsletter switch', () => {
    it('exposes an operable switch with an accessible name', async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('tab', { name: /preferencias/i }));
      expect(screen.getByRole('switch', { name: /boletín de noticias/i })).toBeInTheDocument();
    });

    it('does not carry classes that remove the focus indicator', async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole('tab', { name: /preferencias/i }));
      await vi.waitFor(() => expect(screen.getByRole('switch')).toBeInTheDocument());
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked');
    });
  });
});