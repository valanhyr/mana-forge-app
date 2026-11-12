import { describe, it, expect } from 'vitest';
import {
  scryfallToDeckCard,
  isLegalIn,
  revalidateCards,
} from '../../../../utils/deck/scryfallToDeckCard';
import type { DeckCard } from '../../../../core/models/Deck';

const bolt = {
  id: 'bolt-id',
  name: 'Lightning Bolt',
  mana_cost: '{R}',
  cmc: 1,
  type_line: 'Instant',
  prices: { eur: '1.50' },
  legalities: { premodern: 'legal', commander: 'restricted', standard: 'not_legal' },
  image_uris: { normal: 'https://img/bolt.jpg' },
};

describe('isLegalIn', () => {
  it('accepts legal and restricted, rejects the rest', () => {
    expect(isLegalIn(bolt.legalities, 'premodern')).toBe(true);
    expect(isLegalIn(bolt.legalities, 'commander')).toBe(true);
    expect(isLegalIn(bolt.legalities, 'standard')).toBe(false);
    expect(isLegalIn(bolt.legalities, 'pauper')).toBe(false);
  });

  it('is true when there is no format', () => {
    expect(isLegalIn(bolt.legalities, undefined)).toBe(true);
  });
});

describe('scryfallToDeckCard', () => {
  it('maps the scryfall fields', () => {
    const card = scryfallToDeckCard(bolt, { formatKey: 'premodern', board: 'main', quantity: 4 });
    expect(card).toMatchObject({
      id: 'bolt-id',
      name: 'Lightning Bolt',
      quantity: 4,
      manaCost: '{R}',
      cmc: 1,
      type: 'Instant',
      price: 1.5,
      inCollection: false,
      isValid: true,
      board: 'main',
      image: 'https://img/bolt.jpg',
    });
    expect(card.legalities).toEqual(bolt.legalities);
  });

  it('marks an illegal card as invalid for the format', () => {
    const card = scryfallToDeckCard(bolt, { formatKey: 'standard', board: 'main', quantity: 1 });
    expect(card.isValid).toBe(false);
  });

  it('is valid when no format is selected', () => {
    const card = scryfallToDeckCard(bolt, { board: 'main', quantity: 1 });
    expect(card.isValid).toBe(true);
  });

  it('cuts the subtype and falls back to Unknown', () => {
    const land = scryfallToDeckCard(
      { ...bolt, type_line: 'Basic Land — Mountain' },
      { board: 'main', quantity: 1 }
    );
    expect(land.type).toBe('Basic Land');
    const none = scryfallToDeckCard({ ...bolt, type_line: undefined }, { board: 'main', quantity: 1 });
    expect(none.type).toBe('Unknown');
  });

  it('uses the first face image when there is no top level image', () => {
    const card = scryfallToDeckCard(
      { ...bolt, image_uris: undefined, card_faces: [{ image_uris: { normal: 'face.jpg' } }] },
      { board: 'main', quantity: 1 }
    );
    expect(card.image).toBe('face.jpg');
  });

  it('falls back to an empty image and zero price', () => {
    const card = scryfallToDeckCard(
      { id: 'x', name: 'X', prices: {} },
      { board: 'side', quantity: 2 }
    );
    expect(card.image).toBe('');
    expect(card.price).toBe(0);
    expect(card.board).toBe('side');
  });

  it('reads the game changer flag in every path', () => {
    const flagged = scryfallToDeckCard(
      { ...bolt, game_changer: true },
      { board: 'main', quantity: 1 }
    );
    expect(flagged.isGameChanger).toBe(true);
    const legacy = scryfallToDeckCard(
      { ...bolt, games_changer: true },
      { board: 'main', quantity: 1 }
    );
    expect(legacy.isGameChanger).toBe(true);
    expect(scryfallToDeckCard(bolt, { board: 'main', quantity: 1 }).isGameChanger).toBe(false);
  });

  it('keeps an image override and chosen fields from a saved entry', () => {
    const card = scryfallToDeckCard(bolt, {
      board: 'main',
      quantity: 1,
      imageUrl: 'chosen.jpg',
      chosenPrintId: 'print-1',
      oracleId: 'oracle-1',
    });
    expect(card.image).toBe('chosen.jpg');
    expect(card.chosenPrintId).toBe('print-1');
    expect(card.oracleId).toBe('oracle-1');
  });

  it('stores colour identity and produced mana for later analysis', () => {
    const card = scryfallToDeckCard(
      { ...bolt, color_identity: ['R'], produced_mana: ['R'], oracle_text: 'Deal 3.' },
      { board: 'main', quantity: 1 }
    );
    expect(card.colorIdentity).toEqual(['R']);
    expect(card.producedMana).toEqual(['R']);
    expect(card.oracleText).toBe('Deal 3.');
  });
});

describe('revalidateCards', () => {
  const base: DeckCard = { id: '1', name: 'A', quantity: 1, type: 'Instant', isValid: true };

  it('recomputes isValid from legalities when the format changes', () => {
    const cards: DeckCard[] = [
      { ...base, legalities: { standard: 'not_legal', premodern: 'legal' } },
    ];
    expect(revalidateCards(cards, 'standard')[0].isValid).toBe(false);
    expect(revalidateCards(cards, 'premodern')[0].isValid).toBe(true);
  });

  it('leaves cards without legalities untouched', () => {
    const cards: DeckCard[] = [{ ...base, isValid: false }];
    expect(revalidateCards(cards, 'standard')[0].isValid).toBe(false);
  });

  it('marks everything valid when no format is selected', () => {
    const cards: DeckCard[] = [{ ...base, isValid: false, legalities: { standard: 'banned' } }];
    expect(revalidateCards(cards, undefined)[0].isValid).toBe(true);
  });
});
