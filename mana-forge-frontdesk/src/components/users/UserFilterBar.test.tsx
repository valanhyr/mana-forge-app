import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UserFilterBar } from './UserFilterBar';

const baseProps = {
  search: '',
  onSearchChange: vi.fn(),
  sort: 'openTickets' as const,
  dir: 'desc' as const,
  onSortChange: vi.fn(),
  onDirChange: vi.fn(),
  onTierChange: vi.fn(),
  onStatusChange: vi.fn(),
  onQuotaChange: vi.fn(),
  onClear: vi.fn(),
};

describe('UserFilterBar', () => {
  it('labels every control and hides "clear" until something changes', () => {
    render(<UserFilterBar {...baseProps} />);
    expect(screen.getByLabelText('Search users by username, exact email, ID...')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByLabelText('Plan')).toBeInTheDocument();
    expect(screen.getByLabelText('Account status')).toBeInTheDocument();
    expect(screen.getByLabelText('AI quota')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('emits sort, direction, tier, status and quota changes', () => {
    vi.clearAllMocks();
    render(<UserFilterBar {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'aiUsageToday' } });
    expect(baseProps.onSortChange).toHaveBeenCalledWith('aiUsageToday');

    fireEvent.click(screen.getByRole('button', { name: 'Descending' }));
    expect(baseProps.onDirChange).toHaveBeenCalledWith('asc');

    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'PRO' } });
    expect(baseProps.onTierChange).toHaveBeenCalledWith('PRO');

    fireEvent.change(screen.getByLabelText('Account status'), { target: { value: 'SUSPENDED' } });
    expect(baseProps.onStatusChange).toHaveBeenCalledWith('SUSPENDED');

    fireEvent.change(screen.getByLabelText('AI quota'), { target: { value: 'exhausted' } });
    expect(baseProps.onQuotaChange).toHaveBeenCalledWith('exhausted');
  });

  it('clears an empty select back to "all"', () => {
    vi.clearAllMocks();
    render(<UserFilterBar {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: '' } });
    expect(baseProps.onTierChange).toHaveBeenCalledWith(undefined);
  });

  it('offers "clear filters" once a filter is active', () => {
    const onClear = vi.fn();
    render(<UserFilterBar {...baseProps} status="BANNED" onClear={onClear} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();
  });
});
