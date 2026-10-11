import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketDetail } from './TicketDetail';
import { Ticket } from '../../core/domain/ticket';

const mockTicket: Ticket = {
  id: 'TCK-001',
  userId: 'USR-01',
  userName: 'Urza Planeswalker',
  userEmail: 'urza@manaforge.gg',
  subject: 'Legality check failed for Premodern deck',
  category: 'DECK_BUILDER',
  priority: 'HIGH',
  status: 'OPEN',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: 'MSG-01',
      sender: 'USER',
      senderName: 'Urza Planeswalker',
      content: 'Why is Gilded Drake flagged in Premodern?',
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('TicketDetail', () => {
  it('shows unknown channels for a legacy API instead of assuming access from userId or email', () => {
    render(<TicketDetail ticket={mockTicket} onAddMessage={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText(/channels unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/origin not recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /respond on the web/i })).not.toBeInTheDocument();
  });
  it('clearly marks email-matched contacts as web-inaccessible before offering email', () => {
    const onEmail = vi.fn();
    render(<TicketDetail ticket={{ ...mockTicket, origin: 'CONTACT_FORM', customerVisible: false,
      availableChannels: ['EMAIL'], webUnavailableReason: 'NOT_CUSTOMER_VISIBLE' }}
      onAddMessage={vi.fn()} onUpdateStatus={vi.fn()} onReplyByEmail={onEmail} />);
    expect(screen.getByText(/cannot read this conversation/i)).toBeInTheDocument();
    expect(screen.getByText(/does not verify identity/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /respond by email/i }));
    expect(onEmail).toHaveBeenCalledTimes(1);
  });
  it('has a distinct no-channel state and a private-only action', () => {
    render(<TicketDetail ticket={{ ...mockTicket, userEmail: '', origin: 'UNKNOWN', customerVisible: false,
      availableChannels: [], webUnavailableReason: 'NOT_CUSTOMER_VISIBLE' }} onAddMessage={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText(/no response channel is available/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /respond by email/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: /save note/i })).toBeDisabled();
  });
  it('describes the public web action in Spanish without promising receipt', () => {
    localStorage.setItem('app_locale', 'es');
    render(<TicketDetail ticket={{ ...mockTicket, origin: 'SUPPORT_WEB', customerVisible: true,
      availableChannels: ['WEB', 'EMAIL'], webUnavailableReason: null }} onAddMessage={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Responder en la web' })).toBeInTheDocument();
    expect(screen.getByText(/No se enviará un correo ni se confirma lectura/)).toBeInTheDocument();
    localStorage.removeItem('app_locale');
  });
  it('should display ticket details and messages', () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onAddMessage={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    expect(screen.getByText(/Legality check failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Why is Gilded Drake flagged/i)).toBeInTheDocument();
  });

  it('should allow toggling internal note mode in reply', () => {
    render(
      <TicketDetail
        ticket={mockTicket}
        onAddMessage={vi.fn()}
        onUpdateStatus={vi.fn()}
      />
    );
    const internalCheckbox = screen.getByLabelText(/internal note/i);
    expect(internalCheckbox).not.toBeChecked();
    fireEvent.click(internalCheckbox);
    expect(internalCheckbox).toBeChecked();
  });
});
