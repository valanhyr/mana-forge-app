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
