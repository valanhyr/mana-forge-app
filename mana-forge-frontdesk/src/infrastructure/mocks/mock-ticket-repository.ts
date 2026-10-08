import { ITicketRepository, TicketFilters } from '../../core/ports/ticket-repository.port';
import { Ticket, TicketMessage, TicketStatus } from '../../core/domain/ticket';
import { PageRequest, pageOf } from '../../core/domain/page';
import { seedTickets } from './seeds/seed-tickets';

export class MockTicketRepository implements ITicketRepository {
  private readonly storageKey = 'mana_forge_frontdesk_tickets';

  private getTickets(): Ticket[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      if (stored) {
        return JSON.parse(stored);
      }
      const initial = JSON.parse(JSON.stringify(seedTickets));
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(initial));
      }
      return initial;
    } catch {
      return JSON.parse(JSON.stringify(seedTickets));
    }
  }

  private save(tickets: Ticket[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(tickets));
      }
    } catch {
      // ignore in environments without localStorage
    }
  }

  async listPage(filters: TicketFilters, pagination: PageRequest) {
    return pageOf(await this.list(filters), pagination);
  }

  async list(filters?: TicketFilters): Promise<Ticket[]> {
    let tickets = this.getTickets();

    if (filters?.status) {
      tickets = tickets.filter((t) => t.status === filters.status);
    }

    if (filters?.priority) {
      tickets = tickets.filter((t) => t.priority === filters.priority);
    }
    if (filters?.category) tickets = tickets.filter(ticket => ticket.category === filters.category);

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          (t.metadata?.format && t.metadata.format.toLowerCase().includes(q)) ||
          (t.metadata?.deckTitle && t.metadata.deckTitle.toLowerCase().includes(q)) ||
          t.messages.some((m) => m.content.toLowerCase().includes(q))
      );
    }

    return tickets;
  }

  async getById(id: string): Promise<Ticket | null> {
    const tickets = this.getTickets();
    return tickets.find((t) => t.id === id) || null;
  }

  async createTicket(
    ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>,
    initialMessage: string
  ): Promise<Ticket> {
    const tickets = this.getTickets();
    const now = new Date().toISOString();
    const id = `tck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newTicket: Ticket = {
      ...ticket,
      id,
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}-1`,
          sender: 'USER',
          senderName: ticket.userName,
          content: initialMessage,
          createdAt: now,
          isInternalNote: false,
        },
      ],
    };

    tickets.unshift(newTicket);
    this.save(tickets);
    return newTicket;
  }

  async addMessage(
    ticketId: string,
    message: Omit<TicketMessage, 'id' | 'createdAt'>
  ): Promise<Ticket> {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    const now = new Date().toISOString();
    const newMessage: TicketMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = now;
    this.save(tickets);
    return ticket;
  }

  async updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    this.save(tickets);
    return ticket;
  }

  async assignOperator(
    ticketId: string,
    operatorId: string,
    operatorName: string
  ): Promise<Ticket> {
    const tickets = this.getTickets();
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    ticket.assignedOperatorId = operatorId;
    ticket.assignedOperatorName = operatorName;
    ticket.updatedAt = new Date().toISOString();
    this.save(tickets);
    return ticket;
  }
}
