import { useState } from 'react';
import { AuthService } from '../services/AuthService';

export type PasswordFieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export interface PasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const MIN_LENGTH = 6;

/** Estado del formulario de cambio de contraseña. */
export function usePasswordForm(t: T) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [values, setValues] = useState<PasswordValues>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const open = () => {
    setIsOpen(true);
    setError('');
    setSuccess(false);
  };

  const close = () => {
    setIsOpen(false);
    setError('');
  };

  /** Al escribir se limpia el error: si ya se corrigió, no debe seguir visible. */
  const setValue = (field: PasswordFieldName, value: string) => {
    setValues((previous) => ({ ...previous, [field]: value }));
    setError('');
  };

  const toggleVisibility = (field: PasswordFieldName) =>
    setVisible((previous) => ({ ...previous, [field]: !previous[field] }));

  const submit = async (next: PasswordValues) => {
    setValues(next);
    if (next.newPassword !== next.confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }
    if (next.newPassword.trim().length === 0 || next.newPassword.length < MIN_LENGTH) {
      setError(t('auth.error.passwordMinLength'));
      return;
    }
    if (next.newPassword === next.currentPassword) {
      setError(t('profile.passwordRejected'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      await AuthService.changePassword(next.currentPassword, next.newPassword);
      setSuccess(true);
      setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 2000);
    } catch (err: unknown) {
      setError(
        (err as Error).message === 'wrongPassword'
          ? t('profile.passwordWrong')
          : (err as Error).message === 'passwordRejected'
            ? t('profile.passwordRejected')
            : t('auth.error.credentials')
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    loading,
    error,
    success,
    values,
    visible,
    open,
    close,
    setValue,
    toggleVisibility,
    submit,
  };
}