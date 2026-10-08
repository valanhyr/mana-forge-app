import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { AuditAction, AuditEntry } from '../core/domain/audit';

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

export function useLogAuditEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => container.auditRepo.logEvent(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEYS.all });
    },
  });
}
