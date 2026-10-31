import { describe, it, expect } from 'vitest';
import { toSavePayload, toAnalysisPayload, cacheBust } from '../../../../utils/deck/payloads';
import type { DeckCard } from '../../../../core/models/Deck';
import type { Format } from '../../../../core/models/Format';

const format: Format = {
  id: 'f1',
  name: { en: 'Premodern', es: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

const card = (over: Partial<DeckCard> & { name: string }): DeckCard => ({
  id: over.name,
  quantity: 1,
  type: 'Instant',
  ...over,
});

describe('cacheBust', () => {
  it('adds a v param to full urls', () => {
    expect(cacheBust('https://img.test/a.jpg', 7)).toBe('https://img.test/a.jpg?v=7');
    expect(cacheBust('https://img.test/a.jpg?x=1', 7)).toBe('https://img.test/a.jpg?x=1&v=7');
  });

  it('appends to relative urls and keeps empty values undefined', () => {
    expect(cacheBust('/a.jpg', 7)).toBe('/a.jpg?v=7');
    expect(cacheBust('/a.jpg?x=1', 7)).toBe('/a.jpg?x=1&v=7');
    expect(cacheBust(undefined, 7)).toBeUndefined();
    expect(cacheBust('', 7)).toBeUndefined();
  });
});

describe('toSavePayload', () => {
  it('builds the backend request shape', () => {
    const payload = toSavePayload({
      name: 'Mono Red',
      format,
      userId: 'u1',
      isPrivate: true,
      cards: [
        card({ name: 'Bolt', quantity: 4, image: 'https://img.test/bolt.jpg', oracleId: 'o1' }),
        card({ name: 'Side', board: 'side', chosenPrintId: 'p1', chosenImageUrl: 'https://img.test/c.jpg' }),
        card({ name: 'NoImage' }),
      ],
      scores: { speed: { value: 5, key_cards: [] } },
      cacheKey: 99,
    });
    expect(payload).toEqual({
      name: 'Mono Red',
      formatId: 'f1',
      userId: 'u1',
      isPrivate: true,
      cards: [
        {
          id: 'Bolt',
          oracleId: 'o1',
          quantity: 4,
          board: 'main',
          chosenPrintId: undefined,
          chosenImageUrl: 'https://img.test/bolt.jpg?v=99',
        },
        {
          id: 'Side',
          oracleId: undefined,
          quantity: 1,
          board: 'side',
          chosenPrintId: 'p1',
          chosenImageUrl: 'https://img.test/c.jpg?v=99',
        },
        {
          id: 'NoImage',
          oracleId: undefined,
          quantity: 1,
          board: 'main',
          chosenPrintId: undefined,
          chosenImageUrl: undefined,
        },
      ],
      analysisScores: { speed: { value: 5, key_cards: [] } },
    });
  });
});

describe('toAnalysisPayload', () => {
  const cards = [
    card({ name: 'A', quantity: 4 }),
    card({ name: 'B', quantity: 2, board: 'main' }),
    card({ name: 'S', quantity: 3, board: 'side' }),
    card({ name: 'M', board: 'maybe' }),
    card({ name: 'C', board: 'commander' }),
  ];

  it('puts the commander first in the main deck and keeps the other boards apart', () => {
    const p = toAnalysisPayload({ cards, format, locale: 'es', archetypes: [] });
    expect(p.main_deck).toEqual([
      { name: 'C', quantity: 1 },
      { name: 'A', quantity: 4 },
      { name: 'B', quantity: 2 },
    ]);
    expect(p.sideboard).toEqual([{ name: 'S', quantity: 3 }]);
    expect(p.maybeboard).toEqual([{ name: 'M', quantity: 1 }]);
    expect(p.format_name).toBe('Premodern');
    expect(p.locale).toBe('es');
    expect(p.meta_archetypes).toBeUndefined();
  });

  it('is unchanged when the deck has no commander', () => {
    const p = toAnalysisPayload({
      cards: cards.filter((c) => c.board !== 'commander'),
      format,
      locale: 'en',
      archetypes: [],
    });
    expect(p.main_deck).toEqual([
      { name: 'A', quantity: 4 },
      { name: 'B', quantity: 2 },
    ]);
  });

  it('keeps several commanders (partners) ahead of the main deck', () => {
    const p = toAnalysisPayload({
      cards: [...cards, card({ name: 'C2', board: 'commander' })],
      format,
      locale: 'en',
      archetypes: [],
    });
    expect(p.main_deck.map((c) => c.name)).toEqual(['C', 'C2', 'A', 'B']);
  });

  it('passes archetypes only when present and falls back to the scryfall key', () => {
    const p = toAnalysisPayload({
      cards,
      format: { ...format, name: {} },
      locale: 'en',
      archetypes: ['Aggro'],
    });
    expect(p.meta_archetypes).toEqual(['Aggro']);
    expect(p.format_name).toBe('premodern');
  });
});
