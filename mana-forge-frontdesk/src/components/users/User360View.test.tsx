import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { User360View } from './User360View';
import { User360 } from '../../core/domain/user';

const mockUser: User360 = {
  id: 'USR-01',
  email: 'urza@manaforge.gg',
  username: 'Urza',
  tier: 'PRO',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  lastLoginAt: '2026-10-08T10:00:00Z',
  stats: {
    totalDecks: 14,
    aiQueriesThisMonth: 95,
    aiQuotaLimit: 100,
    failedImportsCount: 1,
  },
  recentDecks: [
    { id: 'DK-01', name: 'Mono Blue Tide', format: 'Premodern', cardCount: 60, updatedAt: '2026-10-07' }
  ],
  openTicketsCount: 1,
};

describe('User360View', () => {
  it('should render user statistics and tier badge', () => {
    render(<User360View user={mockUser} onResetQuota={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText('Urza')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
    expect(screen.getByText(/100 queries/)).toBeInTheDocument();
  });

  it('should trigger quota reset handler on button click', () => {
    const onResetQuota = vi.fn();
    render(<User360View user={mockUser} onResetQuota={onResetQuota} onUpdateStatus={vi.fn()} />);
    const button = screen.getByRole('button', { name: /reset quota/i });
    fireEvent.click(button);
    expect(onResetQuota).toHaveBeenCalledWith('USR-01');
  });

  it('shows daily quota and unknown historical fields without inventing a date', () => {
    render(<User360View user={{ ...mockUser, createdAt: null, lastLoginAt: null,
      stats: { ...mockUser.stats, aiQuotaPeriod: 'DAILY', aiQueriesToday: 3, aiQueriesThisMonth: null, failedImportsCount: null } }}
      onResetQuota={vi.fn()} onUpdateStatus={vi.fn()} />);
    expect(screen.getByText('Daily AI Quota')).toBeInTheDocument();
    expect(screen.getAllByText('Not recorded')).toHaveLength(3);
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
    expect(screen.queryByText('95')).not.toBeInTheDocument();
  });
});
