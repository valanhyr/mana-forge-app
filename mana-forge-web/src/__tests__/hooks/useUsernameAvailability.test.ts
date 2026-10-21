import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUsernameAvailability } from '../../hooks/useUsernameAvailability';
import { AuthService } from '../../services/AuthService';

describe('useUsernameAvailability', () => {
  beforeEach(() => {
    vi.useRealTimers();
    // Sin esto los spies de tests anteriores acumulan llamadas y el test de
    // debounce ve más de una.
    vi.restoreAllMocks();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useUsernameAvailability('original', 'original'));
    expect(result.current.status).toBe('idle');
  });

  it('stays idle when the username is unchanged', async () => {
    const spy = vi.spyOn(AuthService, 'isUsernameAvailable');
    const { result } = renderHook(() => useUsernameAvailability('original', 'original'));
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('reports empty for a blank username', async () => {
    const { result } = renderHook(() => useUsernameAvailability('   ', 'original'));
    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('reports empty when the username is cleared', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: '   ' });
    await waitFor(() => expect(result.current.status).toBe('empty'));
  });

  it('checks availability after the debounce and reports available', async () => {
    const spy = vi.spyOn(AuthService, 'isUsernameAvailable').mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: 'otro' });
    await waitFor(() => expect(result.current.status).toBe('available'), { timeout: 2000 });
    expect(spy).toHaveBeenCalledWith('otro');
  });

  it('reports taken when the API says so', async () => {
    vi.spyOn(AuthService, 'isUsernameAvailable').mockResolvedValue(false);
    const { result, rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: 'ocupado' });
    await waitFor(() => expect(result.current.status).toBe('taken'), { timeout: 2000 });
  });

  it('reports error when the check fails, without crashing', async () => {
    vi.spyOn(AuthService, 'isUsernameAvailable').mockRejectedValue(new Error('boom'));
    const { result, rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: 'otro' });
    await waitFor(() => expect(result.current.status).toBe('error'), { timeout: 2000 });
  });

  it('debounces: does not call the API for every keystroke', async () => {
    const spy = vi.spyOn(AuthService, 'isUsernameAvailable').mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: 'u' });
    rerender({ value: 'ur' });
    rerender({ value: 'urz' });
    rerender({ value: 'urza' });
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(spy).toHaveBeenCalledWith('urza');
  });

  it('blocks saving while blocked or checking', async () => {
    vi.spyOn(AuthService, 'isUsernameAvailable').mockResolvedValue(false);
    const { result, rerender } = renderHook(
      ({ value }) => useUsernameAvailability(value, 'original'),
      { initialProps: { value: 'original' } }
    );
    rerender({ value: 'ocupado' });
    await waitFor(() => expect(result.current.status).toBe('taken'), { timeout: 2000 });
    expect(result.current.isBlocked).toBe(true);
  });

  it('does not block an unchanged username', () => {
    const { result } = renderHook(() => useUsernameAvailability('original', 'original'));
    expect(result.current.isBlocked).toBe(false);
  });

  it('lets the caller force a status after a failed save', () => {
    const { result } = renderHook(() => useUsernameAvailability('original', 'original'));
    act(() => result.current.setStatus('taken'));
    expect(result.current.status).toBe('taken');
  });
});