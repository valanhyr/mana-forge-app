import { api } from './api';

/**
 * Daily analysis quota for visitors and signed-in users. Null means unlimited.
 */
export interface AnalysisQuota {
  limit: number | null;
  remaining: number | null;
  authenticated: boolean;
  /** ISO timestamp of the next daily reset; null when there is no limit. */
  resetsAt: string | null;
}

export interface DeckAnalysisResult {
  general_summary?: string;
  mana_curve_analysis?: string;
  strengths?: string[];
  weaknesses?: string[];
  matchups?: Array<{
    archetype: string;
    strategy: string;
    win_rate_pre: number;
    win_rate_post: number;
  }>;
  suggested_changes?: Array<{
    card_out: string;
    card_in: string;
    reason: string;
    quantity?: number;
  }>;
  scores?: Record<string, { value: number; key_cards: string[] }>;
  projected_scores?: Record<string, { value: number; key_cards: string[] }>;
  /** Present when the engine failed and the backend returned its fallback. */
  error?: string;
  quota?: AnalysisQuota | null;
}

/** Reads the quota headers the backend attaches to every analysis response. */
const readQuotaHeaders = (
  headers: unknown
): { quota: AnalysisQuota | null } => {
  const h = headers as Record<string, unknown> | undefined;
  if (!h) return { quota: null };

  const get = (name: string): string | null => {
    const raw = h[name] ?? h[name.toLowerCase()];
    return typeof raw === 'string' ? raw : null;
  };

  const remainingRaw = get('x-analysis-quota-remaining');
  const limitRaw = get('x-analysis-quota-limit');
  if (remainingRaw === null && limitRaw === null) return { quota: null };

  const toNumber = (value: string | null): number | null => {
    if (value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  return {
    quota: {
      remaining: toNumber(remainingRaw),
      limit: toNumber(limitRaw),
      authenticated: get('x-analysis-authenticated') === 'true',
      resetsAt: get('x-analysis-quota-resets-at'),
    },
  };
};

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
  prices?: { eur?: string; eur_foil?: string; usd?: string; [key: string]: string | undefined };
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
  analysisScores?: Record<string, { value: number; key_cards: string[] }>;
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
    oracleId?: string;
    quantity: number;
    board: 'main' | 'side' | 'commander' | 'maybe';
    chosenPrintId?: string;
    chosenImageUrl?: string;
  }[];
  analysisScores?: Record<string, { value: number; key_cards: string[] }>;
}

export const DeckService = {
  getDailyDeck: async (locale: string): Promise<DailyDeck> => {
    const response = await api.post<DailyDeck>('/decks/random', { locale });
    return response.data;
  },

  rateDailyDeck: async (date: string, stars: number): Promise<DailyDeck> => {
    const response = await api.post<DailyDeck>('/decks/random/rate', { date, stars });
    return response.data;
  },

  getFeaturedDeck: async (): Promise<FeaturedDeck | null> => {
    try {
      const response = await api.get<FeaturedDeck>('/decks/featured');
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveDeck: async (payload: DeckPayload): Promise<any> => {
    const response = await api.post('/decks', payload);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateDeck: async (id: string, payload: DeckPayload): Promise<any> => {
    const response = await api.put(`/decks/${id}`, payload);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDeckById: async (id: string): Promise<any> => {
    const response = await api.get(`/decks/${id}`);
    return response.data;
  },

  getDeckScores: async (payload: {
    main_deck: { name: string; quantity: number }[];
    format_name: string;
    locale: string;
  }): Promise<{ scores: Record<string, { value: number; key_cards: string[] }> }> => {
    const response = await api.post('/decks/scores', payload);
    return response.data;
  },

  /**
   * Runs the AI analysis.
   *
   * Anonymous callers must include `turnstileToken`: the backend refuses to
   * spend AI tokens without a verified Cloudflare challenge, so omitting it
   * simply yields a 403. Authenticated users never need one.
   */
  analyzeDeck: async (
    payload: unknown,
    turnstileToken?: string
  ): Promise<DeckAnalysisResult> => {
    const response = await api.post<DeckAnalysisResult>('/decks/analyze', {
      ...(payload as object),
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
    });
    const { quota } = readQuotaHeaders(response.headers);
    return { ...response.data, quota };
  },

  /**
   * Returns how many analyses the current caller has left. Never throws —
   * the homepage just renders the form without a counter.
   */
  getAnalysisQuota: async (): Promise<AnalysisQuota | null> => {
    try {
      const response = await api.get('/decks/analyze/quota');
      return response.data as AnalysisQuota;
    } catch {
      return null;
    }
  },
  likeDeck: async (deckId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await api.post<{ likesCount: number; likedByMe: boolean }>(
      `/decks/${deckId}/like`
    );
    return response.data;
  },
  unlikeDeck: async (deckId: string): Promise<{ likesCount: number; likedByMe: boolean }> => {
    const response = await api.delete<{ likesCount: number; likedByMe: boolean }>(
      `/decks/${deckId}/like`
    );
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cloneDeck: async (deckId: string): Promise<any> => {
    const response = await api.post(`/decks/${deckId}/clone`);
    return response.data;
  },

  deleteDeck: async (deckId: string): Promise<void> => {
    await api.delete(`/decks/${deckId}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pinDeck: async (deckId: string): Promise<any> => {
    const response = await api.post(`/decks/${deckId}/pin`);
    return response.data;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unpinDeck: async (deckId: string): Promise<any> => {
    const response = await api.delete(`/decks/${deckId}/pin`);
    return response.data;
  },

  searchDecks: async (filters: {
    name?: string;
    formatId?: string;
  }): Promise<DeckSearchResult[]> => {
    const response = await api.get<DeckSearchResult[]>('/decks/search', { params: filters });
    return response.data;
  },
};
