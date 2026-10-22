import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersView } from './UsersView';

const { directory } = vi.hoisted(() => ({
  directory: { users: [] as Record<string, unknown>[], searchPage: vi.fn() },
}));

vi.mock('../infrastructure/container', () => ({
  container: {
    userRepo: {
      searchPage: (filters: unknown, pagination: { page: number; size: number }) =>
        directory.searchPage(filters, pagination),
      getById: async (id: string) => directory.users.find((user) => user.id === id) ?? null,
      search: async () => directory.users,
      updateStatus: async () => directory.users[0],
      resetAiQuota: async () => directory.users[0],
    },
  },
}));

const user = (id: string, username: string) => ({
  id,
  email: `${username.toLowerCase()}@manaforge.gg`,
  username,
  tier: 'PRO',
  createdAt: null,
  lastLoginAt: null,
  status: 'ACTIVE',
  stats: { totalDecks: 2, aiQueriesThisMonth: null, aiQuotaLimit: 25, failedImportsCount: null },
  recentDecks: [],
  openTicketsCount: 1,
});

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

describe('UsersView', () => {
  beforeEach(() => {
    directory.users = [user('u1', 'Urza'), user('u2', 'Mishra')];
    directory.searchPage.mockReset();
    directory.searchPage.mockImplementation(async (_filters: unknown, pagination: { page: number; size: number }) => ({
      items: directory.users,
      page: pagination.page,
      size: pagination.size,
      total: directory.users.length,
    }));
  });

  it('requests the triage order by default instead of the alphabetical legacy order', async () => {
    render(<UsersView />, { wrapper: wrapper() });

    await waitFor(() => expect(directory.searchPage).toHaveBeenCalledWith(
      { query: '', sort: 'openTickets', dir: 'desc' },
      { page: 0, size: 25 },
    ));
    expect(await screen.findByText('Urza')).toBeInTheDocument();
  });

  it('explains an empty filtered directory instead of showing a blank panel', async () => {
    directory.users = [];
    render(<UsersView />, { wrapper: wrapper() });

    expect(await screen.findByText('No users match these filters.')).toBeInTheDocument();
  });
});
