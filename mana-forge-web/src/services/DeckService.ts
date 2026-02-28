import { api } from "./api";

export interface DailyDeck {
  deck_name: string;
  format_name: string;
  archetype: string;
  strategy_summary: string;
  brief_analysis: string;
  main_deck: Array<{ name: string; quantity: number; mana_cost?: string; isGameChanger?: boolean }>;
  sideboard: Array<{ name: string; quantity: number; mana_cost?: string; isGameChanger?: boolean }>;
  cardArtUrl?: string;
  totalRatings?: number;
  averageRating?: number;
  userRating?: number;
  date?: string;
}

export interface DeckCardEntry {
  scryfallId: string;
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  imageUris: { art_crop?: string; normal?: string; small?: string };
  quantity: number;
  isGameChanger?: boolean;
}

export interface DeckView {
  id: string;
  name: string;
  formatName: string;
  ownerUsername: string;
  colors: string[];
  mainDeck: DeckCardEntry[];
  sideboard: DeckCardEntry[];
  likesCount: number;
  likedByMe: boolean;
}


export interface FeaturedDeck {
  id: string;
  name: string;
  formatName: string;
  ownerUsername: string;
  colors: string[];
  featuredScryfallId: string;
  cardArtUrl?: string;
  likesCount: number;
}

export interface DeckSearchResult {
  id: string;
  name: string;
  formatName: string;
  ownerUsername: string;
  colors: string[];
  featuredScryfallId: string;
  likesCount: number;
  cardArtUrl?: string; // Will be populated in the view/service
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

  rateDailyDeck: async (date: string, stars: number): Promise<DailyDeck> => {
    const response = await api.post<DailyDeck>("/decks/random/rate", { date, stars });
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
  likeDeck: async (deckId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await api.post<{ likesCount: number; likedByMe: boolean }>(`/decks/${deckId}/like`);
    return response.data;
  },
  unlikeDeck: async (deckId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await api.delete<{ likesCount: number; likedByMe: boolean }>(`/decks/${deckId}/like`);
    return response.data;
  },

  cloneDeck: async (deckId: string): Promise<any> => {
    const response = await api.post(`/decks/${deckId}/clone`);
    return response.data;
  },

  deleteDeck: async (deckId: string): Promise<void> => {
    await api.delete(`/decks/${deckId}`);
  },

  pinDeck: async (deckId: string): Promise<any> => {
    const response = await api.post(`/decks/${deckId}/pin`);
    return response.data;
  },

  unpinDeck: async (deckId: string): Promise<any> => {
    const response = await api.delete(`/decks/${deckId}/pin`);
    return response.data;
  },

  searchDecks: async (filters: { name?: string; formatId?: string }): Promise<DeckSearchResult[]> => {
    const response = await api.get<DeckSearchResult[]>("/decks/search", { params: filters });
    return response.data;
  },
};
