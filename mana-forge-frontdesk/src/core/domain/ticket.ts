export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'DECK_BUILDER' | 'AI_ANALYSIS' | 'RULES_FORMAT' | 'ACCOUNT' | 'OTHER';
export type TicketOrigin = 'SUPPORT_WEB' | 'CONTACT_FORM' | 'FRONTDESK' | 'UNKNOWN';
export type TicketChannel = 'WEB' | 'EMAIL';
export type WebUnavailableReason = 'NOT_CUSTOMER_VISIBLE' | 'NO_OWNER' | 'OWNER_NOT_FOUND' | 'OWNER_INACTIVE' | 'OWNER_UNVERIFIED';

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
  origin?: TicketOrigin;
  customerVisible?: boolean;
  // Undefined means contract unavailable, not a confirmed empty channel list.
  availableChannels?: TicketChannel[];
  webUnavailableReason?: WebUnavailableReason | null;
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

export type CreateTicketInput = Pick<Ticket, 'userId' | 'userEmail' | 'userName' | 'subject' | 'category' | 'priority' | 'metadata'>
  & { status?: TicketStatus };

const origins: TicketOrigin[] = ['SUPPORT_WEB', 'CONTACT_FORM', 'FRONTDESK', 'UNKNOWN'];
const reasons: WebUnavailableReason[] = ['NOT_CUSTOMER_VISIBLE', 'NO_OWNER', 'OWNER_NOT_FOUND', 'OWNER_INACTIVE', 'OWNER_UNVERIFIED'];

/** Old/invalid API metadata must not turn email or an operational userId into authorization. */
export function normalizeTicket(ticket: Ticket): Ticket {
  const channels = ticket.availableChannels;
  const web = Array.isArray(channels) && channels.includes('WEB');
  const hasOwner = typeof ticket.userId === 'string' && Boolean(ticket.userId.trim());
  const valid = typeof ticket.customerVisible === 'boolean' && Array.isArray(channels)
    && channels.every(channel => channel === 'WEB' || channel === 'EMAIL')
    && new Set(channels).size === channels.length
    && (web ? ticket.customerVisible && typeof ticket.userId === 'string' && Boolean(ticket.userId.trim()) && ticket.webUnavailableReason === null
      : reasons.includes(ticket.webUnavailableReason as WebUnavailableReason))
    && (ticket.customerVisible ? ticket.webUnavailableReason !== 'NOT_CUSTOMER_VISIBLE'
      : ticket.webUnavailableReason === 'NOT_CUSTOMER_VISIBLE')
    && (!ticket.customerVisible || web || (hasOwner ? ticket.webUnavailableReason !== 'NO_OWNER' : ticket.webUnavailableReason === 'NO_OWNER'))
    && (!channels.includes('EMAIL') || (typeof ticket.userEmail === 'string' && Boolean(ticket.userEmail.trim())));
  return { ...ticket, origin: origins.includes(ticket.origin as TicketOrigin) ? ticket.origin : 'UNKNOWN',
    availableChannels: valid ? channels : undefined, webUnavailableReason: valid ? ticket.webUnavailableReason : undefined };
}
