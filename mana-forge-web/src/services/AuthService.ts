import { type User } from "../core/models/User";

const API_URL = "http://localhost:8080/api";

export const AuthService = {
  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Error en las credenciales");
    }

    return response.json();
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
