import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/api`;

export interface DailyDeck {
  deck_name: string;
  format_name: string;
  archetype: string;
  strategy_summary: string;
  brief_analysis: string;
  main_deck: Array<{ name: string; quantity: number }>;
  sideboard: Array<{ name: string; quantity: number }>;
  cardArtUrl?: string; // Se añade dinámicamente después
}

// Esta interfaz coincide con el DeckRequestDTO en el backend
interface DeckPayload {
  name: string;
  formatId: string;
  userId: string;
  isPrivate: boolean;
  cards: {
    id: string; // scryfallId
    quantity: number;
    board: "main" | "side";
  }[];
}

export const DeckService = {
  getDailyDeck: async (locale: string): Promise<DailyDeck> => {
    const response = await fetch(`${API_URL}/decks/random`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ locale }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch daily AI deck");
    }
    return response.json();
  },

  saveDeck: async (payload: DeckPayload): Promise<any> => {
    const response = await fetch(`${API_URL}/decks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al guardar el mazo");
    }

    return await response.json();
  },

  updateDeck: async (id: string, payload: DeckPayload): Promise<any> => {
    const response = await fetch(`${API_URL}/decks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al actualizar el mazo");
    }

    return await response.json();
  },

  getDeckById: async (id: string): Promise<any> => {
    const response = await fetch(`${API_URL}/decks/${id}`);
    if (!response.ok) {
      throw new Error("Error fetching deck");
    }
    return await response.json();
  },

  analyzeDeck: async (payload: any) => {
    // Usamos la constante API_URL que ya apunta a /api
    const response = await fetch(`${API_URL}/decks/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Si usas autenticación, añade aquí tu header Authorization
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Error al analizar el mazo con IA");
    }

    return response.json();
  },
};
