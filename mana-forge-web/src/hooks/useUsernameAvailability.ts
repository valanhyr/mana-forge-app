import { useEffect, useState } from 'react';
import { AuthService } from '../services/AuthService';

export type CheckStatus = 'checking' | 'available' | 'taken' | 'error';
export type UsernameStatus = 'idle' | 'empty' | CheckStatus;

const DEBOUNCE_MS = 400;

interface Result {
  status: CheckStatus;
  value: string;
}

/**
 * Comprueba la disponibilidad de un nombre de usuario con debounce, para no
 * saturar el backend en cada pulsación.
 *
 * Recibe el valor actual y el guardado. Si no ha cambiado no hay nada que
 * verificar y no se llama a la API.
 *
 * Solo se guarda en estado el resultado de la comprobación. `idle`, `empty` y
 * `checking` se derivan durante el render: dependen únicamente de las
 * entradas, y guardarlos exigiría un setState dentro del efecto que el lint de
 * react-hooks marca correctamente como antipatrón.
 */
export function useUsernameAvailability(value: string, savedValue: string) {
  const [result, setResult] = useState<Result | null>(null);

  const trimmed = value.trim();
  const changed = trimmed !== savedValue;

  useEffect(() => {
    if (!changed || trimmed.length === 0) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      AuthService.isUsernameAvailable(trimmed)
        .then((available) => {
          if (!cancelled) {
            setResult({ status: available ? 'available' : 'taken', value: trimmed });
          }
        })
        .catch(() => {
          if (!cancelled) setResult({ status: 'error', value: trimmed });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, changed]);

  // El resultado solo vale para el valor comprobado: si el usuario sigue
  // escribiendo, el anterior no aplica al valor actual.
  const applicable = result !== null && result.value === trimmed;

  let status: UsernameStatus;
  if (applicable) {
    status = result.status;
  } else if (!changed) {
    status = 'idle';
  } else if (trimmed.length === 0) {
    status = 'empty';
  } else {
    status = 'checking';
  }

  /** Permite forzar el estado, por ejemplo cuando el guardado falla con 409. */
  const setStatus = (next: UsernameStatus) => {
    if (next === 'idle' || next === 'empty') {
      setResult(null);
      return;
    }
    setResult({ status: next, value: trimmed });
  };

  return {
    status,
    changed,
    trimmed,
    isBlocked: changed && (status === 'taken' || status === 'empty' || status === 'error'),
    isChecking: status === 'checking',
    setStatus,
  };
}