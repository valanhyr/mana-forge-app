import { AuditAction, AuditEntry } from '../domain/audit';
import { PageRequest, PageResult } from '../domain/page';

export interface AuditFilters { targetUserId?: string; action?: AuditAction; limit?: number }

export interface IAuditRepository {
  list(filters?: { targetUserId?: string; action?: AuditAction; limit?: number }): Promise<AuditEntry[]>;
  listPage(filters: AuditFilters, pagination: PageRequest): Promise<PageResult<AuditEntry>>;
  logEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry>;
}
