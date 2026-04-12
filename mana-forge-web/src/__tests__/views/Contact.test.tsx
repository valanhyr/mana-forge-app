import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import Contact from '../../views/contact/Contact';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';

const BASE = 'http://localhost:8080';

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

const getSubmitButton = () =>
  screen.getByRole('button', { name: /enviar|send/i });

const fillForm = async (
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{ name: string; email: string; subject: string; message: string }> = {}
) => {
  const opts = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    subject: 'general',
    message: 'This is a test message with enough characters.',
    ...overrides,
  };
  const inputs = screen.getAllByRole('textbox');
  await user.clear(inputs[0]);
  await user.type(inputs[0], opts.name);
  await user.clear(inputs[1]);
  await user.type(inputs[1], opts.email);
  if (opts.subject) {
    await user.selectOptions(screen.getByRole('combobox'), opts.subject);
  }
  await user.clear(inputs[2]);
  await user.type(inputs[2], opts.message);
};

describe('Contact page', () => {
  it('renders all form fields', () => {
    renderContact();
    expect(screen.getAllByRole('textbox')).toHaveLength(3); // name, email, textarea
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderContact();
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/nombre|name is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderContact();
    await fillForm(user, { email: 'not-an-email' });
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/formato|invalid/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when no subject selected', async () => {
    const user = userEvent.setup();
    renderContact();
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Ada');
    await user.type(inputs[1], 'ada@example.com');
    await user.type(inputs[2], 'This is a long enough message.');
    // Do not select a subject
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/selecciona|please select/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when message is too short', async () => {
    const user = userEvent.setup();
    renderContact();
    await fillForm(user, { message: 'Short' });
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/10/)).toBeInTheDocument();
    });
  });

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup();
    renderContact();
    await fillForm(user);
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByText(/enviado|sent/i)).toBeInTheDocument();
    });
  });

  it('shows error toast when API returns 500', async () => {
    server.use(
      http.post(`${BASE}/contact`, () => new HttpResponse(null, { status: 500 }))
    );
    const user = userEvent.setup();
    renderContact();
    await fillForm(user);
    await user.click(getSubmitButton());
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('send-another resets the form after success', async () => {
    const user = userEvent.setup();
    renderContact();
    await fillForm(user);
    await user.click(getSubmitButton());
    await waitFor(() => screen.getByText(/enviado|sent/i));
    await user.click(screen.getByText(/otro|another/i));
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(3);
    });
  });
});

