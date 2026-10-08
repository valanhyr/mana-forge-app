import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { container } from '../infrastructure/container';

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
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.all });
    },
  });
}
