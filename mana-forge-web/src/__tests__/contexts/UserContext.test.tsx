import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { UserProvider, useUser } from '../../services/UserContext';
import { LanguageProvider } from '../../services/LanguageContext';
import { mockUser } from '../mocks/handlers';

const BASE = 'http://localhost:8080';

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <UserProvider>{children}</UserProvider>
  </LanguageProvider>
);

const UserDisplay = () => {
  const { user, isAuthenticated, login, logout } = useUser();
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <button onClick={() => login('testuser', 'pass123').catch(() => {})}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('UserContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Hacer que checkSession falle por defecto para evitar auto-login en tests
    server.use(http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })));
  });

  it('isAuthenticated es false cuando no hay sesión', async () => {
    render(
      <AllProviders>
        <UserDisplay />
      </AllProviders>
    );
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false');
    });
  });

  it('login establece el usuario y isAuthenticated pasa a true', async () => {
    server.use(http.post(`${BASE}/users/login`, () => HttpResponse.json(mockUser)));
    const user = userEvent.setup();
    render(
      <AllProviders>
        <UserDisplay />
      </AllProviders>
    );
    // Wait for checkSession to complete (returns 401 → logout → auth=false)
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false');
    });
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => {
      expect(screen.getByTestId('username').textContent).toBe('testuser');
      expect(screen.getByTestId('auth').textContent).toBe('true');
    });
  });

  it('login propaga el error si AuthService.login falla', async () => {
    server.use(http.post(`${BASE}/users/login`, () => new HttpResponse(null, { status: 401 })));
    const TestComponent = () => {
      const { login } = useUser();
      const [error, setError] = React.useState('');
      return (
        <div>
          <span data-testid="error">{error}</span>
          <button onClick={() => login('bad', 'bad').catch((e) => setError(e.message))}>
            Login
          </button>
        </div>
      );
    };
    const user = userEvent.setup();
    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('');
    });
  });

  it('logout limpia user y decks', async () => {
    server.use(
      http.post(`${BASE}/users/login`, () => HttpResponse.json(mockUser)),
      http.post(`${BASE}/users/logout`, () => new HttpResponse(null, { status: 200 }))
    );
    const user = userEvent.setup();
    render(
      <AllProviders>
        <UserDisplay />
      </AllProviders>
    );
    // Wait for checkSession to complete before logging in
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false');
    });
    await user.click(screen.getByRole('button', { name: 'Login' }));
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('true'));

    await user.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false');
      expect(screen.getByTestId('username').textContent).toBe('none');
    });
  });

  it('updateUser actualiza el estado del usuario', async () => {
    const TestComponent = () => {
      const { user, updateUser, isAuthenticated } = useUser();
      return (
        <div>
          <span data-testid="name">{user?.name ?? 'none'}</span>
          <span data-testid="auth">{String(isAuthenticated)}</span>
          <button onClick={() => updateUser({ ...mockUser, name: 'Updated Name' })}>Update</button>
        </div>
      );
    };
    const user = userEvent.setup();
    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    // Wait for checkSession to complete so it doesn't race with updateUser
    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('false');
    });
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('Updated Name');
    });
  });

  it('loadDecks no hace nada si user es null', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/decks/user/:userId`, () => {
        callCount++;
        return HttpResponse.json([]);
      })
    );
    const TestComponent = () => {
      const { loadDecks } = useUser();
      React.useEffect(() => {
        loadDecks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div>test</div>;
    };
    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );
    await waitFor(() => screen.getByText('test'));
    // Give async effects time to settle before checking callCount
    await waitFor(() => expect(screen.getByText('test')).toBeInTheDocument());
    expect(callCount).toBe(0);
  });
});
