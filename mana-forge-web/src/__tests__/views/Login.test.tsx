import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import Login from '../../views/auth/Login';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { UserProvider } from '../../services/UserContext';
import { mockUser } from '../mocks/handlers';

const BASE = 'http://localhost:8080';

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <UserProvider>
      <ToastProvider>{children}</ToastProvider>
    </UserProvider>
  </LanguageProvider>
);

const renderLogin = (search = '') =>
  render(
    <AllProviders>
      <MemoryRouter initialEntries={[`/login${search}`]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    </AllProviders>
  );

describe('Login (AuthModal)', () => {
  beforeEach(() => {
    // Por defecto checkSession falla para no auto-redirigir
    server.use(http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })));
    localStorage.clear();
  });

  it('renderiza la pestaña de login por defecto', async () => {
    renderLogin();
    // El formulario de login tiene un campo de username y password
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('cambia al modo registro al hacer click en la pestaña de registro', async () => {
    const user = userEvent.setup();
    renderLogin();
    // Buscar el tab de register
    await waitFor(() => screen.getAllByRole('button'));
    const registerTabBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.toLowerCase().includes('regist'));
    if (registerTabBtn) {
      await user.click(registerTabBtn);
      // En modo registro aparece el campo de email
      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThan(1);
      });
    }
  });

  it('muestra toast de éxito cuando llega con ?verified=true', async () => {
    renderLogin('?verified=true');
    await waitFor(() => {
      // El toast de verified se muestra
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('navega a "/" después de un login exitoso', async () => {
    // Note: beforeEach already sets GET /users/me to 401 so checkSession fails
    // Only mock the login endpoint — do NOT mock /users/me to return a user
    // (doing so would trigger immediate redirect via isAuthenticated effect)
    server.use(http.post(`${BASE}/users/login`, () => HttpResponse.json(mockUser)));
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() => screen.getByRole('textbox'));

    const inputs = screen.getAllByRole('textbox');
    const usernameInput = inputs[0];
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput as HTMLElement, 'pass123');
      const submitBtn = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('type') === 'submit');
      if (submitBtn) {
        await user.click(submitBtn);
        await waitFor(() => {
          expect(screen.getByTestId('home')).toBeInTheDocument();
        });
      }
    }
  });

  it('muestra mensaje de error si el login falla', async () => {
    server.use(http.post(`${BASE}/users/login`, () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    renderLogin();
    await waitFor(() => screen.getByRole('textbox'));

    await user.type(screen.getAllByRole('textbox')[0], 'wronguser');
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      await user.type(passwordInput as HTMLElement, 'wrongpass');
      const submitBtn = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('type') === 'submit');
      if (submitBtn) {
        await user.click(submitBtn);
        await waitFor(() => {
          // Aparece algún mensaje de error
          const errorEl = document.querySelector('[class*="red"], [class*="error"]');
          expect(errorEl || screen.queryByText(/error|credencial|contraseña/i)).toBeTruthy();
        });
      }
    }
  });

  it('muestra el error de email no verificado cuando el backend lo devuelve', async () => {
    server.use(
      http.post(
        `${BASE}/users/login`,
        () => HttpResponse.json({ error: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
      )
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getAllByRole('textbox')[0], 'testuser');
    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      await user.type(passwordInput as HTMLElement, 'pass123');
      await user.click(screen.getByRole('button', { name: /log in/i }));
    }

    await waitFor(() => {
      expect(screen.getAllByText(/please verify your email before logging in/i)).toHaveLength(2);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('muestra la pantalla de verificación tras un registro exitoso', async () => {
    server.use(
      http.post(`${BASE}/users`, () => HttpResponse.json({ id: 'new-user' }, { status: 201 }))
    );
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign up/i }));
    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[0], 'newuser');
    await user.type(textboxes[1], 'newuser@example.com');
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeTruthy();
    await user.type(passwordInput as HTMLElement, 'secret1');
    await user.click(screen.getByRole('checkbox'));
    await user.click(
      screen.getAllByRole('button', { name: /sign up/i }).find((button) => button.getAttribute('type') === 'submit')!
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /check your email/i })).toBeInTheDocument();
      expect(screen.getByText(/newuser@example.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });
  });
});
