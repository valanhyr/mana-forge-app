import { describe, it, expect } from 'vitest';
import { TYPE_ORDER, groupByType, sortCards } from '../../../../utils/deck/cardTypes';

interface Row {
  name: string;
  cmc?: number;
  type?: string;
  board?: string;
}

const read = (c: Row) => ({ typeLine: c.type, isCommander: c.board === 'commander' });

describe('TYPE_ORDER', () => {
  it('lists commander first and other last', () => {
    expect(TYPE_ORDER[0]).toBe('Commander');
    expect(TYPE_ORDER[TYPE_ORDER.length - 1]).toBe('Other');
    expect(TYPE_ORDER).toEqual([
      'Commander',
      'Planeswalker',
      'Creature',
      'Battle',
      'Instant',
      'Sorcery',
      'Enchantment',
      'Artifact',
      'Land',
      'Other',
    ]);
  });
});

describe('groupByType', () => {
  it('groups by the first matching main type', () => {
    const cards: Row[] = [
      { name: 'Bear', type: 'Creature' },
      { name: 'Myr', type: 'Artifact Creature' },
      { name: 'Bolt', type: 'Instant' },
      { name: 'Mountain', type: 'Basic Land' },
      { name: 'Odd', type: 'Unknown' },
      { name: 'None' },
    ];
    const groups = groupByType(cards, read);
    expect(groups.Creature.map((c) => c.name)).toEqual(['Bear', 'Myr']);
    expect(groups.Instant.map((c) => c.name)).toEqual(['Bolt']);
    expect(groups.Land.map((c) => c.name)).toEqual(['Mountain']);
    expect(groups.Other.map((c) => c.name)).toEqual(['Odd', 'None']);
  });

  it('puts commanders in their own group', () => {
    const cards: Row[] = [{ name: 'Purphoros', type: 'Legendary Creature', board: 'commander' }];
    expect(groupByType(cards, read).Commander).toHaveLength(1);
  });

  it('ignores the subtype after the em dash', () => {
    const cards = [{ name: 'Wall', typeLine: 'Artifact — Creature' }];
    const groups = groupByType(cards, (c) => ({ typeLine: c.typeLine, isCommander: false }));
    expect(groups.Artifact).toHaveLength(1);
    expect(groups.Creature).toBeUndefined();
  });
});

describe('sortCards', () => {
  const cards: Row[] = [
    { name: 'b', cmc: 3 },
    { name: 'a', cmc: 1 },
    { name: 'c' },
  ];

  it('sorts by cmc ascending treating missing as 0', () => {
    expect(sortCards(cards, 'cmc', 'asc').map((c) => c.name)).toEqual(['c', 'a', 'b']);
  });

  it('sorts by cmc descending', () => {
    expect(sortCards(cards, 'cmc', 'desc').map((c) => c.name)).toEqual(['b', 'a', 'c']);
  });

  it('sorts alphabetically and does not mutate the input', () => {
    const sorted = sortCards(cards, 'alpha', 'desc');
    expect(sorted.map((c) => c.name)).toEqual(['c', 'b', 'a']);
    expect(cards.map((c) => c.name)).toEqual(['b', 'a', 'c']);
  });
});
