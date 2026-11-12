import { describe, it, expect } from 'vitest';
import {
  addCards,
  updateQuantity,
  moveCard,
  removeCard,
  setChosenImage,
} from '../../../../utils/deck/cardOps';
import type { DeckCard } from '../../../../core/models/Deck';

const c = (over: Partial<DeckCard> & { id: string; name: string }): DeckCard => ({
  quantity: 1,
  type: 'Instant',
  board: 'main',
  ...over,
});

describe('addCards', () => {
  it('merges quantity for the same name and board', () => {
    const deck = [c({ id: 'a', name: 'Bolt', quantity: 2 })];
    const next = addCards(deck, [c({ id: 'a', name: 'Bolt', quantity: 3 })]);
    expect(next).toHaveLength(1);
    expect(next[0].quantity).toBe(5);
    expect(deck[0].quantity).toBe(2);
  });

  it('keeps different boards as separate entries', () => {
    const deck = [c({ id: 'a', name: 'Bolt' })];
    const next = addCards(deck, [c({ id: 'a', name: 'Bolt', board: 'side' })]);
    expect(next).toHaveLength(2);
  });

  it('adds several new cards and merges duplicates inside the batch', () => {
    const next = addCards([], [c({ id: 'a', name: 'A' }), c({ id: 'a', name: 'A' }), c({ id: 'b', name: 'B' })]);
    expect(next.map((x) => [x.name, x.quantity])).toEqual([
      ['A', 2],
      ['B', 1],
    ]);
  });
});

describe('updateQuantity', () => {
  it('changes the matching card by delta and never drops below 1', () => {
    const deck = [c({ id: 'a', name: 'A', quantity: 2 }), c({ id: 'a', name: 'A', board: 'side' })];
    const up = updateQuantity(deck, deck[0], 2);
    expect(up[0].quantity).toBe(4);
    expect(up[1].quantity).toBe(1);
    expect(updateQuantity(deck, deck[0], -5)[0].quantity).toBe(1);
  });
});

describe('moveCard', () => {
  it('moves one copy and decrements the source', () => {
    const deck = [c({ id: 'a', name: 'A', quantity: 3 })];
    const next = moveCard(deck, deck[0], 'side');
    expect(next.find((x) => x.board === 'main')?.quantity).toBe(2);
    expect(next.find((x) => x.board === 'side')?.quantity).toBe(1);
  });

  it('removes the source when it was the last copy', () => {
    const deck = [c({ id: 'a', name: 'A' })];
    const next = moveCard(deck, deck[0], 'maybe');
    expect(next).toHaveLength(1);
    expect(next[0].board).toBe('maybe');
  });

  it('merges into an existing destination entry', () => {
    const deck = [c({ id: 'a', name: 'A', quantity: 2 }), c({ id: 'a', name: 'A', board: 'side', quantity: 1 })];
    const next = moveCard(deck, deck[0], 'side');
    expect(next.find((x) => x.board === 'side')?.quantity).toBe(2);
    expect(next.find((x) => x.board === 'main')?.quantity).toBe(1);
  });

  it('returns the same deck when the card is not found', () => {
    const deck = [c({ id: 'a', name: 'A' })];
    expect(moveCard(deck, c({ id: 'zzz', name: 'Z' }), 'side')).toBe(deck);
  });
});

describe('removeCard', () => {
  it('removes only the matching id and board', () => {
    const deck = [c({ id: 'a', name: 'A' }), c({ id: 'a', name: 'A', board: 'side' })];
    expect(removeCard(deck, deck[0])).toEqual([deck[1]]);
  });
});

describe('setChosenImage', () => {
  it('updates image and chosen print for the matching card only', () => {
    const deck = [c({ id: 'a', name: 'A' }), c({ id: 'a', name: 'A', board: 'side' })];
    const next = setChosenImage(deck, { id: 'a', board: 'main' }, 'print-1', 'img.jpg');
    expect(next[0]).toMatchObject({ image: 'img.jpg', chosenPrintId: 'print-1', chosenImageUrl: 'img.jpg' });
    expect(next[1].image).toBeUndefined();
  });

  it('is a no-op without a target', () => {
    const deck = [c({ id: 'a', name: 'A' })];
    expect(setChosenImage(deck, null, 'p', 'i')).toEqual(deck);
  });
});
