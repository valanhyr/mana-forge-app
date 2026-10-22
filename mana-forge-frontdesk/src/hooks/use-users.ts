import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';
import { UserListFilters } from '../core/domain/user';

export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  search: (query: string) => [...USER_QUERY_KEYS.all, 'search', query] as const,
  detail: (id: string) => [...USER_QUERY_KEYS.all, 'detail', id] as const,
};

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.search(query),
    queryFn: () => container.userRepo.search(query),
  });
}

export function useUsersPage(filters: UserListFilters, page: number, size = 25, enabled = true) {
  return useQuery({
    queryKey: [
      ...USER_QUERY_KEYS.all, 'page', filters.query,
      filters.sort ?? null, filters.dir ?? null, filters.tier ?? null,
      filters.status ?? null, filters.quota ?? null, page, size,
    ],
    queryFn: () => container.userRepo.searchPage(filters, { page, size }),
    enabled,
  });
}

/** Counts the whole directory, not just the loaded page. */
export function useExhaustedQuotaCount() {
  return useQuery({
    queryKey: [...USER_QUERY_KEYS.all, 'quota-exhausted', 'total'],
    queryFn: async () => (await container.userRepo.searchPage(
      { query: '', quota: 'exhausted' }, { page: 0, size: 1 },
    )).total,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: USER_QUERY_KEYS.detail(id),
    queryFn: () => container.userRepo.getById(id),
    enabled: Boolean(id),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' }) =>
      container.userRepo.updateStatus(userId, status),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(USER_QUERY_KEYS.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });
}

export function useResetAiQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => container.userRepo.resetAiQuota(userId),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(USER_QUERY_KEYS.detail(updatedUser.id), updatedUser);
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });
}
