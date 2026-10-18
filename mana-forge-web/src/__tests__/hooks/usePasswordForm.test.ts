import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordForm } from '../../hooks/usePasswordForm';
import { AuthService } from '../../services/AuthService';

const t = (key: string) => key;
const messages = {
  mismatch: 'profile.passwordMismatch',
  tooShort: 'auth.error.passwordMinLength',
  rejected: 'profile.passwordRejected',
  wrongPassword: 'profile.passwordWrong',
  credentials: 'auth.error.credentials',
};

describe('usePasswordForm', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts closed, silent and empty', () => {
    const { result } = renderHook(() => usePasswordForm(t));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.success).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.values.currentPassword).toBe('');
  });

  it('opens the form', () => {
    const { result } = renderHook(() => usePasswordForm(t));
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('clears a previous error when reopened', async () => {
    const { result } = renderHook(() => usePasswordForm(t));
    act(() => result.current.open());
    await act(async () => {
      await result.current.submit({ currentPassword: 'a', newPassword: 'b', confirmPassword: 'c' });
    });
    expect(result.current.error).toBe(messages.mismatch);
    act(() => result.current.close());
    act(() => result.current.open());
    expect(result.current.error).toBe('');
  });

  it('rejects mismatched passwords without calling the API', async () => {
    const spy = vi.spyOn(AuthService, 'changePassword');
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja1',
        newPassword: 'Nueva123',
        confirmPassword: 'Otra123',
      });
    });
    expect(result.current.error).toBe(messages.mismatch);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects a password under the minimum length', async () => {
    const spy = vi.spyOn(AuthService, 'changePassword');
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja1',
        newPassword: 'corta',
        confirmPassword: 'corta',
      });
    });
    expect(result.current.error).toBe(messages.tooShort);
    expect(spy).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const spy = vi.spyOn(AuthService, 'changePassword');
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Misma123',
        newPassword: 'Misma123',
        confirmPassword: 'Misma123',
      });
    });
    expect(result.current.error).toBe(messages.rejected);
    expect(spy).not.toHaveBeenCalled();
  });

  it('changes the password and clears the fields', async () => {
    const spy = vi.spyOn(AuthService, 'changePassword').mockResolvedValue(undefined);
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja123',
        newPassword: 'Nueva123',
        confirmPassword: 'Nueva123',
      });
    });
    expect(spy).toHaveBeenCalledWith('Vieja123', 'Nueva123');
    expect(result.current.success).toBe(true);
    expect(result.current.values).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  });

  it('maps a wrong password error', async () => {
    vi.spyOn(AuthService, 'changePassword').mockRejectedValue(new Error('wrongPassword'));
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja123',
        newPassword: 'Nueva123',
        confirmPassword: 'Nueva123',
      });
    });
    expect(result.current.error).toBe(messages.wrongPassword);
    expect(result.current.success).toBe(false);
  });

  it('maps a rejected password error', async () => {
    vi.spyOn(AuthService, 'changePassword').mockRejectedValue(new Error('passwordRejected'));
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja123',
        newPassword: 'Nueva123',
        confirmPassword: 'Nueva123',
      });
    });
    expect(result.current.error).toBe(messages.rejected);
  });

  it('falls back to a generic error for an unknown failure', async () => {
    vi.spyOn(AuthService, 'changePassword').mockRejectedValue(new Error('algo raro'));
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja123',
        newPassword: 'Nueva123',
        confirmPassword: 'Nueva123',
      });
    });
    expect(result.current.error).toBe(messages.credentials);
  });

  it('tracks the visibility of each field independently', () => {
    const { result } = renderHook(() => usePasswordForm(t));
    expect(result.current.visible.currentPassword).toBe(false);
    act(() => result.current.toggleVisibility('currentPassword'));
    expect(result.current.visible.currentPassword).toBe(true);
    expect(result.current.visible.newPassword).toBe(false);
    act(() => result.current.toggleVisibility('newPassword'));
    expect(result.current.visible.newPassword).toBe(true);
    expect(result.current.visible.currentPassword).toBe(true);
  });

  it('clears the error as soon as a field changes', async () => {
    vi.spyOn(AuthService, 'changePassword').mockRejectedValue(new Error('wrongPassword'));
    const { result } = renderHook(() => usePasswordForm(t));
    await act(async () => {
      await result.current.submit({
        currentPassword: 'Vieja123',
        newPassword: 'Nueva123',
        confirmPassword: 'Nueva123',
      });
    });
    expect(result.current.error).toBe(messages.wrongPassword);
    act(() => result.current.setValue('currentPassword', 'otra'));
    expect(result.current.error).toBe('');
  });
});