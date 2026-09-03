import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  const { user, isAuthenticated, login, logout, register } = useUser();
  const [regError, setRegError] = React.useState('');
  return (
    <div>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <span data-testid="auth">{String(isAuthenticated)}</span>
      <span data-testid="reg-error">{regError}</span>
      <button onClick={() => login('testuser', 'pass123').catch(() => {})}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => register('newuser', 'new@test.com', 'pass').catch(e => setRegError(e.message))}>Register</button>
    </div>
  );
};

describe('UserContext', () => {
  let consoleErrorSpy: any;
  beforeEach(() => {
    // Suppress noisy console.error logs that are intentionally triggered in tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
    // Hacer que checkSession falle por defecto para evitar auto-login en tests
    server.use(http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 })));
  });
  afterEach(() => {
    consoleErrorSpy?.mockRestore?.();
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
    // Wait for checkSession to complete (returns null on 401 → auth=false)
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

  it('register retorna exitosamente', async () => {
    server.use(
      http.post(`${BASE}/users`, () => HttpResponse.json(mockUser)),
      http.get(`${BASE}/users/me`, () => new HttpResponse(null, { status: 401 }))
    );
    const TestComponent = () => {
      const { register } = useUser();
      const [status, setStatus] = React.useState('');
      return (
        <div>
          <span data-testid="status">{status}</span>
          <button
            onClick={() =>
              register('newuser', 'new@example.com', 'pass')
                .then(() => setStatus('success'))
                .catch(e => setStatus('error'))
            }
          >
            Register
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
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('success');
    });
  });

  it('register mapea USERNAME_TAKEN error', async () => {
    server.use(
      http.post(`${BASE}/users`, () =>
        HttpResponse.json({ message: 'USERNAME_TAKEN' }, { status: 409 })
      )
    );
    const TestComponent = () => {
      const { register } = useUser();
      const [error, setError] = React.useState('');
      return (
        <div>
          <span data-testid="error">{error}</span>
          <button
            onClick={() =>
              register('taken', 'email@test.com', 'pass').catch(e => setError(e.message))
            }
          >
            Register
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
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('');
    });
  });

  it('register mapea EMAIL_TAKEN error', async () => {
    server.use(
      http.post(`${BASE}/users`, () =>
        HttpResponse.json({ message: 'EMAIL_TAKEN' }, { status: 409 })
      )
    );
    const TestComponent = () => {
      const { register } = useUser();
      const [error, setError] = React.useState('');
      return (
        <div>
          <span data-testid="error">{error}</span>
          <button
            onClick={() =>
              register('newuser', 'taken@test.com', 'pass').catch(e => setError(e.message))
            }
          >
            Register
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
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('');
    });
  });

  it('register mapea CONFLICT error', async () => {
    server.use(
      http.post(`${BASE}/users`, () =>
        HttpResponse.json({ message: 'CONFLICT' }, { status: 409 })
      )
    );
    const TestComponent = () => {
      const { register } = useUser();
      const [error, setError] = React.useState('');
      return (
        <div>
          <span data-testid="error">{error}</span>
          <button
            onClick={() =>
              register('user', 'email@test.com', 'pass').catch(e => setError(e.message))
            }
          >
            Register
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
    await user.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('');
    });
  });
});
