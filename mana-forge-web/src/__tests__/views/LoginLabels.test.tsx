import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../views/auth/Login';
import { LanguageProvider } from '../../services/LanguageContext';
import { UserProvider } from '../../services/UserContext';
import { ToastProvider } from '../../services/ToastContext';

const Providers = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <UserProvider>
      <ToastProvider>{children}</ToastProvider>
    </UserProvider>
  </LanguageProvider>
);

const renderLogin = () =>
  render(
    <Providers>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div data-testid="home">Home</div>} />
        </Routes>
      </MemoryRouter>
    </Providers>
  );

describe('Login form labels', () => {
  beforeEach(() => {
    // El primer render deja el usuario autenticado en el contexto si otro
    // test lo dejó; Login redirige fuera del form en ese caso.
    cleanup();
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
  });

  it('associates the username label with the username field', async () => {
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText('Usuario')).toBeInTheDocument());
    expect(screen.getByLabelText('Usuario')).toHaveAttribute('type', 'text');
  });

  it('associates the password label with the password field', async () => {
    renderLogin();
    await waitFor(() => expect(screen.getByLabelText('Contraseña')).toBeInTheDocument());
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });

  it('every input in the login form has an associated label', async () => {
    const { container } = renderLogin();
    await waitFor(() => expect(container.querySelectorAll('input').length).toBeGreaterThan(0));
    const inputs = Array.from(container.querySelectorAll('input'));
    for (const input of inputs) {
      const id = input.getAttribute('id');
      const hasLabel = id && container.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const wrapped = input.closest('label');
      expect(
        hasLabel || hasAriaLabel || wrapped,
        `input sin etiqueta: ${input.outerHTML.slice(0, 90)}`
      ).toBeTruthy();
    }
  });

  it('wires the username label to its input with htmlFor', async () => {
    // jsdom no implementa el salto de foco al pulsar un label, así que se
    // comprueba el mecanismo (htmlFor) y no el efecto.
    const { container } = renderLogin();
    await waitFor(() => expect(screen.getByLabelText('Usuario')).toBeInTheDocument());
    const input = screen.getByLabelText('Usuario');
    const label = container.querySelector('label[for]');
    expect(label?.getAttribute('for')).toBe(input.id);
    expect(input.id).not.toBe('');
  });
});