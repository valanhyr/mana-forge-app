export type UserTier = 'FREE' | 'PRO' | 'PATREON';

export interface UserSummaryDeck {
  id: string;
  name: string;
  format: string;
  cardCount: number;
  updatedAt: string;
}

export interface User360 {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  tier: UserTier;
  createdAt: string;
  lastLoginAt: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  stats: {
    totalDecks: number;
    aiQueriesThisMonth: number;
    aiQuotaLimit: number;
    failedImportsCount: number;
  };
  recentDecks: UserSummaryDeck[];
  openTicketsCount: number;
}
