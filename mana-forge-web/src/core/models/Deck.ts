export type DeckBoard = 'main' | 'side' | 'commander' | 'maybe';

export interface DeckCard {
  id: string;
  name: string;
  quantity: number;
  manaCost?: string;
  cmc?: number;
  type: string;
  price?: number;
  inCollection?: boolean;
  isValid?: boolean;
  board?: DeckBoard;
  isGameChanger?: boolean;
  image?: string;
  legalities?: Record<string, string>;
  producedMana?: string[];
  colorIdentity?: string[];
  oracleText?: string;
  oracleId?: string;
  chosenPrintId?: string;
  chosenImageUrl?: string;
}
