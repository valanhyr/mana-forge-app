import { describe, it, expect } from 'vitest';
import { validateDeck, countByBoard, isCommanderFormat } from '../../../../utils/deck/validateDeck';
import type { DeckCard } from '../../../../core/models/Deck';
import type { Format } from '../../../../core/models/Format';

const premodern: Format = {
  id: 'f1',
  name: { en: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

const commander: Format = {
  id: 'f2',
  name: { en: 'Commander' },
  scryfallKey: 'commander',
  config: { minMainDeck: 99, maxMainDeck: 100, maxSideboard: 0, maxCopies: 1 },
  isActive: true,
};

const card = (over: Partial<DeckCard> & { name: string }): DeckCard => ({
  id: over.name,
  quantity: 1,
  type: 'Instant',
  board: 'main',
  ...over,
});

const mountains = (n: number): DeckCard =>
  card({ name: 'Mountain', type: 'Basic Land', quantity: n });

const codes = (r: ReturnType<typeof validateDeck>) => r.errors.map((e) => e.code);

describe('isCommanderFormat', () => {
  it('detects commander and edh keys', () => {
    expect(isCommanderFormat(commander)).toBe(true);
    expect(isCommanderFormat({ ...commander, scryfallKey: 'EDH' })).toBe(true);
    expect(isCommanderFormat(premodern)).toBe(false);
    expect(isCommanderFormat(null)).toBe(false);
  });
});

describe('countByBoard', () => {
  it('sums quantities per board and counts missing board as main', () => {
    const cards = [
      card({ name: 'a', quantity: 3 }),
      card({ name: 'b', quantity: 2, board: undefined }),
      card({ name: 'c', quantity: 4, board: 'side' }),
      card({ name: 'd', board: 'commander' }),
      card({ name: 'e', quantity: 5, board: 'maybe' }),
    ];
    expect(countByBoard(cards)).toEqual({ main: 5, side: 4, commander: 1, maybe: 5 });
  });
});

describe('validateDeck', () => {
  it('requires a name first', () => {
    const r = validateDeck({ name: '  ', format: premodern, cards: [] });
    expect(r.isValid).toBe(false);
    expect(codes(r)).toEqual(['needName']);
  });

  it('requires a format after the name', () => {
    const r = validateDeck({ name: 'x', format: null, cards: [] });
    expect(codes(r)).toEqual(['needFormat']);
  });

  it('reports the minimum main deck size with params', () => {
    const r = validateDeck({ name: 'x', format: premodern, cards: [mountains(40)] });
    expect(r.errors).toEqual([{ code: 'minCards', params: { min: 60, current: 40 } }]);
  });

  it('accepts a legal 60 card deck', () => {
    const r = validateDeck({ name: 'x', format: premodern, cards: [mountains(60)] });
    expect(r).toEqual({ isValid: true, errors: [] });
  });

  it('reports max main deck and max sideboard', () => {
    const capped: Format = { ...premodern, config: { ...premodern.config, maxMainDeck: 60 } };
    const r = validateDeck({
      name: 'x',
      format: capped,
      cards: [mountains(61), card({ name: 'Side', type: 'Basic Land', quantity: 16, board: 'side' })],
    });
    expect(r.errors).toEqual([
      { code: 'maxCards', params: { max: 60 } },
      { code: 'maxSideboard', params: { max: 15 } },
    ]);
  });

  it('flags illegal cards', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [mountains(60), card({ name: 'Banned', isValid: false })],
    });
    expect(codes(r)).toContain('illegalCards');
    expect(r.isValid).toBe(false);
  });

  it('limits copies except basic lands', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [mountains(56), card({ name: 'Bolt', quantity: 5 })],
    });
    expect(r.errors).toEqual([{ code: 'maxCopies', params: { max: 4 } }]);
  });

  it('sums copies of the same name across boards', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [mountains(56), card({ name: 'Bolt', quantity: 3 }), card({ name: 'Bolt', quantity: 2, board: 'side' })],
    });
    expect(codes(r)).toContain('maxCopies');
  });

  it('commander needs exactly 100 cards and a commander', () => {
    const r = validateDeck({ name: 'x', format: commander, cards: [mountains(60)] });
    expect(codes(r)).toEqual(['commander100', 'commanderNeeded']);
  });

  it('commander forbids a sideboard', () => {
    const r = validateDeck({
      name: 'x',
      format: commander,
      cards: [
        mountains(99),
        card({ name: 'Boss', board: 'commander' }),
        card({ name: 'Side', type: 'Basic Land', board: 'side' }),
      ],
    });
    expect(codes(r)).toEqual(['noSideboardCommander']);
  });

  it('accepts a valid commander deck', () => {
    const r = validateDeck({
      name: 'x',
      format: commander,
      cards: [mountains(99), card({ name: 'Boss', board: 'commander' })],
    });
    expect(r.isValid).toBe(true);
  });

  it('ignores the maybeboard for size and legality counts', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [mountains(60), card({ name: 'Maybe', quantity: 2, board: 'maybe' })],
    });
    expect(r.isValid).toBe(true);
  });

  it('keeps counting every board for copy limits, as the builder did', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [mountains(60), card({ name: 'Maybe', quantity: 9, board: 'maybe' })],
    });
    expect(codes(r)).toEqual(['maxCopies']);
  });

  it('derives card legality from legalities when present', () => {
    const r = validateDeck({
      name: 'x',
      format: premodern,
      cards: [
        mountains(59),
        card({ name: 'Old', isValid: true, legalities: { premodern: 'banned' } }),
      ],
    });
    expect(codes(r)).toContain('illegalCards');
  });
});
