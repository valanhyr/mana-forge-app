import { Ticket, TicketMessage, TicketPriority, TicketStatus } from '../domain/ticket';

export interface ITicketRepository {
  list(filters?: { status?: TicketStatus; priority?: TicketPriority; query?: string }): Promise<Ticket[]>;
  getById(id: string): Promise<Ticket | null>;
  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage: string): Promise<Ticket>;
  addMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<Ticket>;
  updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket>;
  assignOperator(ticketId: string, operatorId: string, operatorName: string): Promise<Ticket>;
}
