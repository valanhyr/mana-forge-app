import { type User } from '../core/models/User';
import { api, API_URL } from './api';
import { csrfHeaders } from './csrf';

interface UpdateProfilePayload {
  biography: string;
  avatar: string;
  username?: string;
}

interface PublicUser {
  userId: string;
  username: string;
}

export const AuthService = {
  setNewsletterPreference: async (subscribed: boolean): Promise<{ subscribed: boolean }> => {
    const headers = await csrfHeaders('/newsletter/csrf');
    const { data } = await api.patch<{ subscribed: boolean }>('/newsletter/preference', { subscribed }, { headers });
    return data;
  },

  unsubscribeNewsletter: async (token: string): Promise<void> => {
    await api.post('/newsletter/unsubscribe', { token });
  },
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

  register: async (username: string, email: string, password: string, name?: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, email, password, name }),
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
      let rawMsg = '';
      if (errorData && typeof errorData === 'object') {
        const ed = errorData as Record<string, unknown>;
        if (typeof ed.message === 'string') rawMsg = ed.message;
        else if (typeof ed.error === 'string') rawMsg = ed.error;
      }
      if (!rawMsg) rawMsg = bodyText;

      console.debug('AuthService.register response', { status: response.status, errorData, bodyText, rawMsg });

      if (response.status === 409) {
        // Throw the exact message returned by the backend (e.g., "El nombre de usuario ya existe")
        throw new Error(rawMsg || 'Error en el registro');
      }
      // Fallback for other error statuses
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
    // 400 = el backend rechaza la nueva contraseña (en blanco, corta o idéntica a la actual)
    if (response.status === 400) throw new Error('passwordRejected');
    if (!response.ok) throw new Error('changePasswordFailed');
  },

  updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
    try {
      const response = await api.patch<User>('/users/me', payload);
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        throw new Error('USERNAME_TAKEN');
      }
      throw err;
    }
  },

  // El endpoint público devuelve 404 cuando el username está libre.
  isUsernameAvailable: async (username: string): Promise<boolean> => {
    try {
      await api.get<PublicUser>(`/users/username/${encodeURIComponent(username)}`);
      return false;
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        return true;
      }
      throw err;
    }
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
  
  getUserDecks: async (userId: string): Promise<Record<string, unknown>[]> => {
    const response = await fetch(`${API_URL}/decks/user/${userId}`);
    if (!response.ok) {
      throw new Error('Error fetching user decks');
    }
    const json = (await response.json()) as Record<string, unknown>[];
    return json;
  },
};
