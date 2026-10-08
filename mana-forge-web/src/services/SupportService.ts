import { api } from './api';
import { csrfHeaders } from './csrf';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'DECK_BUILDER' | 'AI_ANALYSIS' | 'RULES_FORMAT' | 'ACCOUNT' | 'OTHER';
export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: Array<{ id: string; sender: 'USER' | 'OPERATOR' | 'SYSTEM'; content: string; createdAt: string }>;
}
export interface TicketPage { items: SupportTicket[]; total: number; page: number; size: number }
export const SupportService = {
  async list(page = 0): Promise<TicketPage> {
    return (await api.get<TicketPage>('/support/tickets', { params: { page, size: 25 } })).data;
  },
  async get(id: string): Promise<SupportTicket> {
    return (await api.get<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}`)).data;
  },
  async create(payload: { subject: string; category: TicketCategory; content: string }): Promise<SupportTicket> {
    const headers = await csrfHeaders('/support/csrf');
    return (await api.post<SupportTicket>('/support/tickets', payload, { headers })).data;
  },
  async reply(id: string, content: string): Promise<SupportTicket> {
    const headers = await csrfHeaders('/support/csrf');
    return (await api.post<SupportTicket>(`/support/tickets/${encodeURIComponent(id)}/messages`, { content }, { headers })).data;
  },
};
