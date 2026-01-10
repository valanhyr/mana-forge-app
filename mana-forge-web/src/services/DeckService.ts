import { api } from "./api";

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
    // Enviamos el locale tanto en el body (para el engine) como en el header (por el interceptor)
    const response = await api.post<DailyDeck>("/decks/random", { locale });
    return response.data;
  },

  saveDeck: async (payload: DeckPayload): Promise<any> => {
    const response = await api.post("/decks", payload);
    return response.data;
  },

  updateDeck: async (id: string, payload: DeckPayload): Promise<any> => {
    const response = await api.put(`/decks/${id}`, payload);
    return response.data;
  },

  getDeckById: async (id: string): Promise<any> => {
    const response = await api.get(`/decks/${id}`);
    return response.data;
  },

  analyzeDeck: async (payload: any) => {
    const response = await api.post("/decks/analyze", payload);
    return response.data;
  },
};
