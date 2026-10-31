import type { DeckCard } from '../../core/models/Deck';
import { groupByType, sortCards, type SortDir, type SortMode } from './cardTypes';
import { countByBoard } from './validateDeck';

export type GroupMode = 'type' | 'none';

export interface DeckView {
  mainDeckCards: DeckCard[];
  sideCards: DeckCard[];
  maybeCards: DeckCard[];
  mainGroups: Record<string, DeckCard[]>;
  mainCount: number;
  sideCount: number;
  totalCount: number;
  totalPrice: number;
}

export const buildDeckView = (
  cards: DeckCard[],
  groupMode: GroupMode,
  sortMode: SortMode,
  sortDir: SortDir
): DeckView => {
  const mainDeckCards = cards.filter((c) => c.board !== 'maybe' && c.board !== 'side');
  const sideCards = cards.filter((c) => c.board === 'side');
  const maybeCards = cards.filter((c) => c.board === 'maybe');
  const counts = countByBoard(cards);

  const mainGroups: Record<string, DeckCard[]> =
    groupMode === 'type'
      ? Object.fromEntries(
          Object.entries(
            groupByType(mainDeckCards, (c) => ({
              typeLine: c.type,
              isCommander: c.board === 'commander',
            }))
          ).map(([type, group]) => [type, sortCards(group, sortMode, sortDir)])
        )
      : { All: sortCards(mainDeckCards, sortMode, sortDir) };

  return {
    mainDeckCards,
    sideCards,
    maybeCards,
    mainGroups,
    mainCount: counts.main,
    sideCount: counts.side,
    totalCount: mainDeckCards.reduce((s, c) => s + c.quantity, 0),
    totalPrice: cards.reduce((sum, c) => sum + (c.price ?? 0) * c.quantity, 0),
  };
};
