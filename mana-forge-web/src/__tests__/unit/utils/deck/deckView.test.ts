import { describe, it, expect } from 'vitest';
import { buildDeckView } from '../../../../utils/deck/deckView';
import type { DeckCard } from '../../../../core/models/Deck';

const c = (over: Partial<DeckCard> & { name: string }): DeckCard => ({
  id: over.name,
  quantity: 1,
  type: 'Instant',
  board: 'main',
  ...over,
});

const cards: DeckCard[] = [
  c({ name: 'Bolt', cmc: 1, quantity: 4, price: 2 }),
  c({ name: 'Bear', cmc: 2, type: 'Creature', quantity: 2, price: 0.5 }),
  c({ name: 'Boss', type: 'Legendary Creature', board: 'commander' }),
  c({ name: 'Side', board: 'side', quantity: 3 }),
  c({ name: 'Maybe', board: 'maybe' }),
];

describe('buildDeckView', () => {
  it('splits boards and counts', () => {
    const v = buildDeckView(cards, 'type', 'cmc', 'asc');
    expect(v.mainDeckCards.map((x) => x.name)).toEqual(['Bolt', 'Bear', 'Boss']);
    expect(v.sideCards.map((x) => x.name)).toEqual(['Side']);
    expect(v.maybeCards.map((x) => x.name)).toEqual(['Maybe']);
    expect(v.mainCount).toBe(6);
    expect(v.sideCount).toBe(3);
    expect(v.totalCount).toBe(7);
  });

  it('sums price over every board', () => {
    expect(buildDeckView(cards, 'type', 'cmc', 'asc').totalPrice).toBe(9);
  });

  it('groups by type with the commander apart, sorted inside each group', () => {
    const v = buildDeckView(cards, 'type', 'alpha', 'desc');
    expect(Object.keys(v.mainGroups).sort()).toEqual(['Commander', 'Creature', 'Instant']);
    expect(v.mainGroups.Creature.map((x) => x.name)).toEqual(['Bear']);
  });

  it('uses a single All group when grouping is off', () => {
    const v = buildDeckView(cards, 'none', 'cmc', 'desc');
    expect(Object.keys(v.mainGroups)).toEqual(['All']);
    expect(v.mainGroups.All.map((x) => x.name)).toEqual(['Bear', 'Bolt', 'Boss']);
  });
});
