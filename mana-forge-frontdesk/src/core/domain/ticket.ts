export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'DECK_BUILDER' | 'AI_ANALYSIS' | 'RULES_FORMAT' | 'ACCOUNT' | 'OTHER';

export interface TicketMessage {
  id: string;
  sender: 'OPERATOR' | 'USER' | 'SYSTEM';
  senderName: string;
  content: string;
  createdAt: string;
  isInternalNote?: boolean;
}

export interface Ticket {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
  metadata?: {
    deckId?: string;
    deckTitle?: string;
    format?: string;
  };
}
