import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAnalysisQuota } from '../../hooks/useAnalysisQuota';
import { DeckService } from '../../services/DeckService';

const session = vi.hoisted(() => ({ user: { userId: 'u1' }, isAuthenticated: true }));
vi.mock('../../services/UserContext', () => ({ useUser: () => session }));
afterEach(() => { vi.useRealTimers(); session.user.userId = 'u1'; });

describe('Analysis quota renewal', () => {
  it('refreshes from the server at the daily reset instead of inventing a new allowance', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T23:59:58Z'));
    const read = vi.spyOn(DeckService, 'getAnalysisQuota')
      .mockResolvedValueOnce({ limit: 25, remaining: 0, authenticated: true, resetsAt: '2026-10-10T00:00:00Z' })
      .mockResolvedValue({ limit: 25, remaining: 25, authenticated: true, resetsAt: '2026-10-11T00:00:00Z' });
    const { result } = renderHook(() => useAnalysisQuota());
    await act(async () => {});
    expect(result.current.quota?.remaining).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(read).toHaveBeenCalledTimes(2); expect(result.current.quota?.remaining).toBe(25);
  });
  it('hides the previous accounts counter while fetching a new identity', async () => {
    vi.spyOn(DeckService, 'getAnalysisQuota').mockResolvedValueOnce({ limit: 25, remaining: 4, authenticated: true, resetsAt: null })
      .mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = renderHook(() => useAnalysisQuota());
    await act(async () => {}); expect(result.current.quota?.remaining).toBe(4);
    session.user.userId = 'u2'; rerender(); expect(result.current.quota).toBeNull();
  });
});
