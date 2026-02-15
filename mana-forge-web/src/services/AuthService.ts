import { type User } from "../core/models/User";
import { API_URL } from "./api";

export const AuthService = {
  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // CRÍTICO: Permite recibir y guardar las cookies (JSESSIONID, isLoged) del backend
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Error en las credenciales");
    }

    return response.json();
  },

  register: async (
    username: string,
    email: string,
    password: string,
  ): Promise<User> => {
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Spring Boot devuelve el mensaje en 'message', fallback a 'error' o texto genérico
      throw new Error(
        errorData.message || errorData.error || "Error en el registro",
      );
    }

    return response.json();
  },

  checkSession: async (): Promise<User> => {
    const response = await fetch(`${API_URL}/users/me`, {
      method: "GET",
      credentials: "include", // Envía la cookie JSESSIONID para validar la sesión
    });

    if (!response.ok) {
      throw new Error("Sesión inválida o expirada");
    }
    return response.json();
  },

  logout: async (): Promise<void> => {
    // Llamada al backend para invalidar la sesión y borrar la cookie HttpOnly
    await fetch(`${API_URL}/users/logout`, {
      method: "POST",
      credentials: "include",
    });
  },

  // Simulación de fetch de mazos (conectaremos con el backend real luego)
  getUserDecks: async (userId: string): Promise<any[]> => {
    const response = await fetch(`${API_URL}/decks/user/${userId}`);
    if (!response.ok) {
      throw new Error("Error fetching user decks");
    }
    return response.json();
  },
};
