import { AuditAction, AuditEntry } from '../domain/audit';

export interface IAuditRepository {
  list(filters?: { targetUserId?: string; action?: AuditAction; limit?: number }): Promise<AuditEntry[]>;
  logEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
}
