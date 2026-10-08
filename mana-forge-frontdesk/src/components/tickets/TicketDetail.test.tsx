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
