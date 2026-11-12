import type { DeckBoard, DeckCard } from '../../core/models/Deck';

const same = (a: DeckCard, b: { id: string; board?: string }) =>
  a.id === b.id && a.board === b.board;

export const addCards = <T extends DeckCard>(deck: T[], toAdd: T[]): T[] => {
  const next = [...deck];
  for (const card of toAdd) {
    const index = next.findIndex((c) => c.name === card.name && c.board === card.board);
    if (index > -1) {
      next[index] = { ...next[index], quantity: next[index].quantity + card.quantity };
    } else {
      next.push(card);
    }
  }
  return next;
};

export const updateQuantity = <T extends DeckCard>(deck: T[], card: DeckCard, delta: number): T[] =>
  deck.map((c) => (same(c, card) ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));

export const moveCard = <T extends DeckCard>(deck: T[], card: DeckCard, target: DeckBoard): T[] => {
  const next = [...deck];
  const sourceIndex = next.findIndex((c) => same(c, card));
  if (sourceIndex === -1) return deck;

  const source = next[sourceIndex];
  if (source.quantity > 1) {
    next[sourceIndex] = { ...source, quantity: source.quantity - 1 };
  } else {
    next.splice(sourceIndex, 1);
  }

  const moved = { ...(card as T), board: target, quantity: 1 };
  const destIndex = next.findIndex((c) => c.name === moved.name && c.board === moved.board);
  if (destIndex > -1) {
    next[destIndex] = { ...next[destIndex], quantity: next[destIndex].quantity + 1 };
  } else {
    next.push(moved);
  }
  return next;
};

export const removeCard = <T extends DeckCard>(deck: T[], card: DeckCard): T[] =>
  deck.filter((c) => !same(c, card));

export const setChosenImage = <T extends DeckCard>(
  deck: T[],
  target: { id: string; board: string } | null,
  printId: string,
  imageUrl: string
): T[] =>
  deck.map((c) =>
    target && same(c, target)
      ? { ...c, image: imageUrl, chosenPrintId: printId, chosenImageUrl: imageUrl }
      : c
  );
