import { useEffect, useState } from 'react';

/**
 * Returns the initial value immediately (so the first request is not delayed),
 * then follows `value` only after it has been stable for `delay` milliseconds.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay, debounced]);

  return debounced;
}
