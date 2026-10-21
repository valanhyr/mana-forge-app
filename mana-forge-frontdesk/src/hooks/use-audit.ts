import { useQuery } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { AuditAction } from '../core/domain/audit';

export const AUDIT_QUERY_KEYS = {
  all: ['audit'] as const,
  list: (filters?: { targetUserId?: string; action?: AuditAction; limit?: number }) =>
    [...AUDIT_QUERY_KEYS.all, 'list', filters] as const,
};

export function useAuditLog(filters?: { targetUserId?: string; action?: AuditAction; limit?: number }) {
  return useQuery({
    queryKey: AUDIT_QUERY_KEYS.list(filters),
    queryFn: () => container.auditRepo.list(filters),
  });
}

export function useAuditPage(action: AuditAction | undefined, page: number) {
  return useQuery({ queryKey: ['audit', 'page', action, page],
    queryFn: () => container.auditRepo.listPage({ action }, { page, size: 25 }) });
}
