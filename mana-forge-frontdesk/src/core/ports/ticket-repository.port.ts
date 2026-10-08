import { Ticket, TicketMessage, TicketPriority, TicketStatus } from '../domain/ticket';
import { PageRequest, PageResult } from '../domain/page';
import { TicketCategory } from '../domain/ticket';

export interface TicketFilters { status?: TicketStatus; priority?: TicketPriority; category?: TicketCategory; query?: string }

export interface ITicketRepository {
  list(filters?: TicketFilters): Promise<Ticket[]>;
  listPage(filters: TicketFilters, pagination: PageRequest): Promise<PageResult<Ticket>>;
  getById(id: string): Promise<Ticket | null>;
  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage: string): Promise<Ticket>;
  addMessage(ticketId: string, message: Omit<TicketMessage, 'id' | 'createdAt'>): Promise<Ticket>;
  updateStatus(ticketId: string, status: TicketStatus): Promise<Ticket>;
  assignOperator(ticketId: string, operatorId: string, operatorName: string): Promise<Ticket>;
}
