import { api } from "./api";

export interface DailyDeck {
  deck_name: string;
  format_name: string;
  archetype: string;
  strategy_summary: string;
  brief_analysis: string;
  main_deck: Array<{ name: string; quantity: number }>;
  sideboard: Array<{ name: string; quantity: number }>;
  cardArtUrl?: string;
}

export interface DeckCardEntry {
  scryfallId: string;
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  imageUris: { art_crop?: string; normal?: string; small?: string };
  quantity: number;
}

export interface DeckView {
  id: string;
  name: string;
  formatName: string;
  ownerUsername: string;
  colors: string[];
  mainDeck: DeckCardEntry[];
  sideboard: DeckCardEntry[];
}


export interface FeaturedDeck {
  id: string;
  name: string;
  formatName: string;
  ownerUsername: string;
  colors: string[];
  featuredScryfallId: string;
  cardArtUrl?: string;
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
    const response = await api.post<DailyDeck>("/decks/random", { locale });
    return response.data;
  },

  getFeaturedDeck: async (): Promise<FeaturedDeck | null> => {
    try {
      const response = await api.get<FeaturedDeck>("/decks/featured");
      return response.data;
    } catch {
      return null;
    }
  },

  getDeckView: async (deckId: string): Promise<DeckView | null> => {
    try {
      const response = await api.get<DeckView>(`/decks/${deckId}/view`);
      return response.data;
    } catch {
      return null;
    }
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
