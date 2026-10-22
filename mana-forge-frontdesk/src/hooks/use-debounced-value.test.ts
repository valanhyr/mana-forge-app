import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the current value immediately and delays later changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'ur' } },
    );
    expect(result.current).toBe('ur');

    rerender({ value: 'urza' });
    expect(result.current).toBe('ur');

    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('ur');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('urza');
  });
});
