import type { DeckBoard, DeckCard } from '../../core/models/Deck';
import { safeNested, safeNumber, safeString } from '../scryfallHelpers';

type Legalities = Record<string, string> | undefined | null;

export const isLegalIn = (legalities: Legalities, formatKey?: string): boolean => {
  if (!formatKey) return true;
  const legal = legalities?.[formatKey];
  return legal === 'legal' || legal === 'restricted';
};

export interface ScryfallToDeckCardOptions {
  formatKey?: string;
  board: DeckBoard;
  quantity: number;
  imageUrl?: string;
  chosenPrintId?: string;
  oracleId?: string;
}

const stringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;

export const scryfallToDeckCard = (
  card: Record<string, unknown>,
  options: ScryfallToDeckCardOptions
): DeckCard => {
  const legalities = safeNested(card, ['legalities']) as Record<string, string> | undefined;
  const image =
    options.imageUrl ||
    (safeNested(card, ['image_uris', 'normal']) as string | undefined) ||
    (safeNested(card, ['card_faces', '0', 'image_uris', 'normal']) as string | undefined) ||
    '';

  return {
    id: safeString(card, 'id'),
    name: safeString(card, 'name'),
    quantity: options.quantity,
    manaCost: safeString(card, 'mana_cost'),
    cmc: safeNumber(card, 'cmc'),
    type: safeString(card, 'type_line').split('—')[0]?.trim() || 'Unknown',
    price: parseFloat((safeNested(card, ['prices', 'eur']) as string | undefined) || '0'),
    inCollection: false,
    isValid: isLegalIn(legalities, options.formatKey),
    board: options.board,
    isGameChanger: card.games_changer === true || card.game_changer === true,
    image,
    legalities,
    producedMana: stringArray(card.produced_mana),
    colorIdentity: stringArray(card.color_identity),
    oracleText: typeof card.oracle_text === 'string' ? card.oracle_text : undefined,
    chosenPrintId: options.chosenPrintId,
    oracleId: options.oracleId,
  };
};

export const revalidateCards = <T extends DeckCard>(cards: T[], formatKey?: string): T[] =>
  cards.map((c) => (c.legalities ? { ...c, isValid: isLegalIn(c.legalities, formatKey) } : c));
