import { type User } from '../core/models/User';
import { api, API_URL } from './api';

interface UpdateProfilePayload {
  biography: string;
  avatar: string;
}

export const AuthService = {
  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // CRÍTICO: Permite recibir y guardar las cookies (JSESSIONID, isLoged) del backend
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data.error === 'EMAIL_NOT_VERIFIED') {
          throw new Error('EMAIL_NOT_VERIFIED');
        }
      }
      throw new Error('Error en las credenciales');
    }

    return response.json();
  },

  register: async (username: string, email: string, password: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      // Try to parse JSON, fallback to text so we catch plain messages
      let errorData: unknown = {};
      let bodyText = '';
      try {
        errorData = await response.json();
      } catch {
        try {
          bodyText = await response.text();
        } catch {
          bodyText = '';
        }
      }
      // Prefer explicit fields, otherwise use raw body text
      const rawMsg = (errorData && typeof errorData === 'object' && 'message' in errorData ? (errorData as any).message : (errorData && typeof errorData === 'object' && 'error' in errorData ? (errorData as any).error : bodyText)).toString();
      const msg = rawMsg.toLowerCase();

      // Helpful debug log for client-side troubleshooting
      // eslint-disable-next-line no-console
      console.debug('AuthService.register response', { status: response.status, errorData, bodyText, rawMsg });

      if (response.status === 409) {
        if (msg.includes('nombre de usuario') || msg.includes('username') || msg.includes('usuario ya')) throw new Error('USERNAME_TAKEN');
        if (msg.includes('correo') || msg.includes('email') || msg.includes('ya est') || msg.includes('registrad')) throw new Error('EMAIL_TAKEN');
        throw new Error('CONFLICT');
      }
      throw new Error(rawMsg || 'Error en el registro');
    }

    return response.json();
  },

  checkSession: async (): Promise<User | null> => {
    try {
      const response = await api.get<User>('/users/me');
      return response.data;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    // Llamada al backend para invalidar la sesión y borrar la cookie HttpOnly
    await fetch(`${API_URL}/users/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_URL}/users/me/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (response.status === 401) throw new Error('wrongPassword');
    if (!response.ok) throw new Error('changePasswordFailed');
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    const response = await api.patch<User>('/users/me', payload);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<void> => {
    const response = await fetch(`${API_URL}/users/verify?token=${encodeURIComponent(token)}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('INVALID_TOKEN');
    }
  },

  // Simulación de fetch de mazos (conectaremos con el backend real luego)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUserDecks: async (userId: string): Promise<any[]> => {
    const response = await fetch(`${API_URL}/decks/user/${userId}`);
    if (!response.ok) {
      throw new Error('Error fetching user decks');
    }
    return response.json();
  },
};
