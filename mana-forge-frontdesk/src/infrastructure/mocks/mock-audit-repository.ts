import { IAuditRepository } from '../../core/ports/audit-repository.port';
import { AuditAction, AuditEntry } from '../../core/domain/audit';
import { seedAudit } from './seeds/seed-audit';
import { PageRequest, pageOf } from '../../core/domain/page';
import { AuditFilters } from '../../core/ports/audit-repository.port';

export class MockAuditRepository implements IAuditRepository {
  private readonly storageKey = 'mana_forge_frontdesk_audit';

  private getLogs(): AuditEntry[] {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      if (stored) return JSON.parse(stored);
      const initial = JSON.parse(JSON.stringify(seedAudit));
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(initial));
      return initial;
    } catch {
      return JSON.parse(JSON.stringify(seedAudit));
    }
  }

  private save(logs: AuditEntry[]): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch {
      // storage unavailable or mocked
    }
  }

  async list(filters?: { targetUserId?: string; action?: AuditAction; limit?: number }): Promise<AuditEntry[]> {
    let logs = this.getLogs();
    if (filters?.action) logs = logs.filter((l) => l.action === filters.action);
    if (filters?.targetUserId) logs = logs.filter((l) => l.targetUserId === filters.targetUserId);
    if (filters?.limit) logs = logs.slice(0, filters.limit);
    return logs;
  }

  async listPage(filters: AuditFilters, pagination: PageRequest) {
    return pageOf(await this.list({ targetUserId: filters.targetUserId, action: filters.action }), pagination);
  }

  async logEvent(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const logs = this.getLogs();
    const newEntry: AuditEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    this.save(logs);
    return newEntry;
  }
}
