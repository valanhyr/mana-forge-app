export type UserTier = 'FREE' | 'PRO' | 'PATREON';

export interface UserSummaryDeck {
  id: string;
  name: string;
  format: string;
  cardCount: number;
  updatedAt: string | null;
}

export interface User360 {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  tier: UserTier;
  createdAt: string | null;
  updatedAt?: string | null;
  lastLoginAt: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  stats: {
    totalDecks: number;
    aiQueriesThisMonth: number | null;
    aiQueriesToday?: number | null;
    aiQuotaLimit: number | null;
    aiQuotaPeriod?: 'DAILY' | 'MONTHLY';
    aiQuotaResetsAt?: string | null;
    failedImportsCount: number | null;
  };
  recentDecks: UserSummaryDeck[];
  openTicketsCount: number;
}

export const normalizeUser360 = (user: User360): User360 => ({
  ...user,
  createdAt: user.createdAt ?? null,
  updatedAt: user.updatedAt ?? null,
  lastLoginAt: user.lastLoginAt ?? null,
});
