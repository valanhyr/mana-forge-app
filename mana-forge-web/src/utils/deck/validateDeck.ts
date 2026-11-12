import type { DeckCard } from '../../core/models/Deck';
import type { Format } from '../../core/models/Format';
import { isLegalIn } from './scryfallToDeckCard';

export type DeckValidationCode =
  | 'needName'
  | 'needFormat'
  | 'commander100'
  | 'commanderNeeded'
  | 'noSideboardCommander'
  | 'minCards'
  | 'maxCards'
  | 'maxSideboard'
  | 'illegalCards'
  | 'maxCopies';

export interface DeckValidationError {
  code: DeckValidationCode;
  params?: Record<string, number>;
}

export interface DeckValidation {
  isValid: boolean;
  errors: DeckValidationError[];
}

export interface BoardCounts {
  main: number;
  side: number;
  commander: number;
  maybe: number;
}

export const isCommanderFormat = (format: Format | null | undefined): boolean => {
  if (!format) return false;
  const key = (format.scryfallKey || '').toLowerCase();
  return key === 'commander' || key === 'edh';
};

export const countByBoard = (cards: DeckCard[]): BoardCounts => {
  const counts: BoardCounts = { main: 0, side: 0, commander: 0, maybe: 0 };
  for (const c of cards) counts[c.board ?? 'main'] += c.quantity;
  return counts;
};

const isCardIllegal = (card: DeckCard, format: Format): boolean =>
  card.legalities ? !isLegalIn(card.legalities, format.scryfallKey) : card.isValid === false;

export const validateDeck = (input: {
  name: string;
  format: Format | null;
  cards: DeckCard[];
}): DeckValidation => {
  const { name, format, cards } = input;
  if (!name.trim()) return { isValid: false, errors: [{ code: 'needName' }] };
  if (!format) return { isValid: false, errors: [{ code: 'needFormat' }] };

  const errors: DeckValidationError[] = [];
  const counts = countByBoard(cards);

  if (isCommanderFormat(format)) {
    if (counts.main + counts.commander !== 100) errors.push({ code: 'commander100' });
    if (counts.commander < 1) errors.push({ code: 'commanderNeeded' });
    if (counts.side > 0) errors.push({ code: 'noSideboardCommander' });
  } else {
    const { minMainDeck, maxMainDeck, maxSideboard } = format.config;
    if (counts.main < minMainDeck) {
      errors.push({ code: 'minCards', params: { min: minMainDeck, current: counts.main } });
    }
    if (maxMainDeck && counts.main > maxMainDeck) {
      errors.push({ code: 'maxCards', params: { max: maxMainDeck } });
    }
    if (counts.side > maxSideboard) {
      errors.push({ code: 'maxSideboard', params: { max: maxSideboard } });
    }
  }

  if (cards.some((c) => isCardIllegal(c, format))) errors.push({ code: 'illegalCards' });

  const copies: Record<string, number> = {};
  for (const c of cards) {
    if (!c.type.includes('Basic')) copies[c.name] = (copies[c.name] || 0) + c.quantity;
  }
  if (Object.values(copies).some((n) => n > format.config.maxCopies)) {
    errors.push({ code: 'maxCopies', params: { max: format.config.maxCopies } });
  }

  return { isValid: errors.length === 0, errors };
};
