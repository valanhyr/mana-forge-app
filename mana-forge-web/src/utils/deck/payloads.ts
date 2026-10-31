import type { DeckCard } from '../../core/models/Deck';
import type { Format } from '../../core/models/Format';

export type AnalysisScores = Record<string, { value: number; key_cards: string[] }>;

export const cacheBust = (url: string | null | undefined, key: number): string | undefined => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    u.searchParams.set('v', String(key));
    return u.toString();
  } catch {
    return url + (url.includes('?') ? '&' : '?') + 'v=' + key;
  }
};

export interface SavePayload {
  name: string;
  formatId: string;
  userId: string;
  isPrivate: boolean;
  cards: {
    id: string;
    oracleId?: string;
    quantity: number;
    board: 'main' | 'side' | 'commander' | 'maybe';
    chosenPrintId?: string;
    chosenImageUrl?: string;
  }[];
  analysisScores?: AnalysisScores;
}

export const toSavePayload = (input: {
  name: string;
  format: Format;
  userId: string;
  isPrivate: boolean;
  cards: DeckCard[];
  scores?: AnalysisScores;
  cacheKey: number;
}): SavePayload => ({
  name: input.name,
  formatId: input.format.id,
  userId: input.userId,
  isPrivate: input.isPrivate,
  cards: input.cards.map((card) => ({
    id: card.id,
    oracleId: card.oracleId,
    quantity: card.quantity,
    board: card.board || 'main',
    chosenPrintId: card.chosenPrintId,
    chosenImageUrl: cacheBust(card.chosenImageUrl || card.image || undefined, input.cacheKey),
  })),
  analysisScores: input.scores,
});

const toEntries = (cards: DeckCard[]) => cards.map((c) => ({ name: c.name, quantity: c.quantity }));

export const toAnalysisPayload = (input: {
  cards: DeckCard[];
  format: Format;
  locale: string;
  archetypes: string[];
}) => ({
  // The engine expects the commander inside main_deck, listed first.
  main_deck: toEntries([
    ...input.cards.filter((c) => c.board === 'commander'),
    ...input.cards.filter((c) => c.board === 'main' || !c.board),
  ]),
  sideboard: toEntries(input.cards.filter((c) => c.board === 'side')),
  maybeboard: toEntries(input.cards.filter((c) => c.board === 'maybe')),
  format_name: input.format.name.en || input.format.scryfallKey,
  locale: input.locale,
  meta_archetypes: input.archetypes.length > 0 ? input.archetypes : undefined,
});
