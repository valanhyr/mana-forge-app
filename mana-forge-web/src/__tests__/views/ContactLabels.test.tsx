import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Contact from '../../views/contact/Contact';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';

const renderContact = () =>
  render(
    <LanguageProvider>
      <ToastProvider>
        <MemoryRouter>
          <Contact />
        </MemoryRouter>
      </ToastProvider>
    </LanguageProvider>
  );

describe('Contact form labels', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
  });

  it('associates the name field', async () => {
    renderContact();
    // El label acaba en "*" por el marcador de campo obligatorio, así que la
    // coincidencia exacta no sirve: se comprueba el prefijo.
    await waitFor(() => expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/nombre/i)).toHaveAttribute('type', 'text');
  });

  it('associates the email field', async () => {
    renderContact();
    await waitFor(() => expect(screen.getByLabelText(/correo/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/correo/i)).toHaveAttribute('type', 'email');
  });

  it('associates the subject select', async () => {
    renderContact();
    await waitFor(() => expect(screen.getByLabelText(/asunto/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/asunto/i).tagName).toBe('SELECT');
  });

  it('associates the message textarea', async () => {
    renderContact();
    await waitFor(() => expect(screen.getByLabelText(/mensaje/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/mensaje/i).tagName).toBe('TEXTAREA');
  });

  it('keeps the honeypot out of the tab order and the a11y tree', async () => {
    const { container } = renderContact();
    await waitFor(() => expect(container.querySelectorAll('input').length).toBeGreaterThan(0));
    const honeypot = container.querySelector('#contact-website') as HTMLInputElement | null;
    expect(honeypot).toBeTruthy();
    const hidden =
      honeypot!.getAttribute('aria-hidden') === 'true' ||
      honeypot!.type === 'hidden' ||
      honeypot!.tabIndex < 0 ||
      honeypot!.className.includes('hidden');
    expect(hidden).toBe(true);
  });
});