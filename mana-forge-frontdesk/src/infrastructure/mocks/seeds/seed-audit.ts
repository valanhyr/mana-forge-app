import { AuditEntry } from '../../../core/domain/audit';

export const seedAudit: AuditEntry[] = [
  {
    id: 'aud-001',
    timestamp: '2026-10-08T09:15:00.000Z',
    actor: {
      id: 'user-urza',
      name: 'Urza',
      role: 'USER',
    },
    targetUserId: 'user-urza',
    targetUserName: 'Urza',
    action: 'USER_LOGIN',
    details: 'User authenticated from web client.',
  },
  {
    id: 'aud-002',
    timestamp: '2026-10-07T11:20:00.000Z',
    actor: {
      id: 'user-mishra',
      name: 'Mishra',
      role: 'USER',
    },
    targetUserId: 'user-mishra',
    targetUserName: 'Mishra',
    action: 'DECK_IMPORT_FAILED',
    details: 'Deck import failed for Moxfield export containing bracketed Scryfall UUIDs.',
  },
  {
    id: 'aud-003',
    timestamp: '2026-10-06T10:00:00.000Z',
    actor: {
      id: 'user-urza',
      name: 'Urza',
      role: 'USER',
    },
    targetUserId: 'user-urza',
    targetUserName: 'Urza',
    action: 'TICKET_CREATED',
    details: 'Ticket #tck-001 created: AI sideboard suggestions include Modern-only cards for Premodern deck.',
  },
  {
    id: 'aud-004',
    timestamp: '2026-10-05T09:45:00.000Z',
    actor: {
      id: 'op-jace',
      name: 'Jace Beleren',
      role: 'OPERATOR',
    },
    targetUserId: 'user-teferi',
    targetUserName: 'Teferi Akosa',
    action: 'AI_QUOTA_RESET',
    details: 'Operator Jace Beleren manually reset monthly AI quota following user request.',
  },
  {
    id: 'aud-005',
    timestamp: '2026-10-05T09:50:00.000Z',
    actor: {
      id: 'op-jace',
      name: 'Jace Beleren',
      role: 'OPERATOR',
    },
    targetUserId: 'user-teferi',
    targetUserName: 'Teferi Akosa',
    action: 'EMAIL_SENT',
    details: 'Sent AI Quota Reset Notification email to teferi@manaforge.gg.',
  },
];
