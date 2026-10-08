export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_STATUS_UPDATE'
  | 'AI_QUOTA_RESET'
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_NOTE_ADDED'
  | 'TICKET_MESSAGE_ADDED'
  | 'TICKET_ASSIGNED'
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'
  | 'DECK_IMPORT_FAILED';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: 'OPERATOR' | 'USER' | 'SYSTEM';
  };
  targetUserId?: string;
  targetUserName?: string;
  action: AuditAction;
  details: string;
  metadata?: Record<string, unknown>;
}
