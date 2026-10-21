import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EmailComposer } from './EmailComposer';
import { EmailTemplate } from '../../core/domain/email';

const mockTemplate: EmailTemplate = {
  id: 'TPL-01',
  title: 'AI Quota Restored',
  category: 'SUPPORT',
  subject: 'Your AI Quota on Mana Forge has been reset',
  bodyTemplate: 'Dear {{user.name}},\n\nYour limit has been restored.',
  availableMacros: ['user.name'],
};

describe('EmailComposer', () => {
  afterEach(() => localStorage.removeItem('app_locale'));
  it('exposes template selection to the keyboard and translates the contextual preview', () => {
    localStorage.setItem('app_locale', 'es');
    render(<EmailComposer templates={[mockTemplate]} onSend={vi.fn()} ticketId="t1"
      initialRecipient={{ email: 'contact@example.com', name: 'Contact' }} />);
    expect(screen.getByRole('button', { name: /AI Quota Restored/ })).toBeInTheDocument();
    expect(screen.getByText('Vista previa del correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo del destinatario')).toHaveAttribute('readonly');
    localStorage.removeItem('app_locale');
  });
  it('never silently changes the displayed contextual destination when the ticket is refreshed', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<EmailComposer templates={[]} onSend={send} ticketId="t1"
      initialRecipient={{ email: 'old@example.com', name: 'Contact' }} />);
    fireEvent.change(screen.getByLabelText(/^subject$/i), { target: { value: 'Help' } });
    fireEvent.change(screen.getByLabelText(/body content/i), { target: { value: 'My answer' } });
    rerender(<EmailComposer templates={[]} onSend={send} ticketId="t1"
      initialRecipient={{ email: 'new@example.com', name: 'Contact' }} />);
    expect(screen.getByLabelText(/recipient email/i)).toHaveValue('old@example.com');
    fireEvent.click(screen.getByRole('button', { name: /dispatch email/i }));
    await waitFor(() => expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'old@example.com', ticketId: 't1' })));
  });
  it('keeps a contextual recipient fixed and submits the ticket reference only on explicit send', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    render(<EmailComposer templates={[]} onSend={send} ticketId="contact-ticket"
      initialRecipient={{ email: 'contact@example.com', name: 'Contact' }} />);
    expect(screen.getByLabelText(/recipient email/i)).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: /audience broadcast/i })).not.toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^subject$/i), { target: { value: 'Your query' } });
    fireEvent.change(screen.getByLabelText(/body content/i), { target: { value: 'Public email body' } });
    fireEvent.click(screen.getByRole('button', { name: /dispatch email/i }));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'contact@example.com', ticketId: 'contact-ticket', body: 'Public email body' }));
  });
  it('should render template fields and live preview', () => {
    render(<EmailComposer templates={[mockTemplate]} onSend={vi.fn()} />);
    const recipientInput = screen.getByLabelText(/recipient email/i);
    fireEvent.change(recipientInput, { target: { value: 'mishra@manaforge.gg' } });
    expect(screen.getByDisplayValue('mishra@manaforge.gg')).toBeInTheDocument();
  });

  it('should switch to audience broadcast mode', () => {
    render(<EmailComposer templates={[mockTemplate]} onSend={vi.fn()} onSendBroadcast={vi.fn()} />);
    const broadcastBtn = screen.getByRole('button', { name: /audience broadcast/i });
    fireEvent.click(broadcastBtn);
    expect(screen.getByText(/target broadcast audience/i)).toBeInTheDocument();
    expect(screen.getAllByText(/30 recipients/i).length).toBeGreaterThan(0);
  });

  it('disables unsupported broadcasts and unresolved macros in live mode', () => {
    const onSend = vi.fn();
    render(<EmailComposer templates={[mockTemplate]} onSend={onSend} />);
    expect(screen.getByRole('button', { name: /audience broadcast/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'user@example.com' } });
    expect(screen.getByRole('button', { name: /dispatch email/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/macro value user.name/i), { target: { value: 'Actual customer' } });
    expect(screen.getByRole('button', { name: /dispatch email/i })).toBeEnabled();
    expect(onSend).not.toHaveBeenCalled();
  });
});
