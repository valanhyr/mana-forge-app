import { useCallback, useState } from 'react';
import type { DeckBoard, DeckCard } from '../core/models/Deck';
import {
  addCards,
  moveCard,
  removeCard,
  setChosenImage,
  updateQuantity,
} from '../utils/deck/cardOps';
import { revalidateCards } from '../utils/deck/scryfallToDeckCard';

export const useDeckCards = () => {
  const [cards, setCards] = useState<DeckCard[]>([]);

  const add = useCallback((toAdd: DeckCard[]) => setCards((deck) => addCards(deck, toAdd)), []);
  const changeQuantity = useCallback(
    (card: DeckCard, delta: number) => setCards((deck) => updateQuantity(deck, card, delta)),
    []
  );
  const move = useCallback(
    (card: DeckCard, target: DeckBoard) => setCards((deck) => moveCard(deck, card, target)),
    []
  );
  const remove = useCallback((card: DeckCard) => setCards((deck) => removeCard(deck, card)), []);
  const chooseImage = useCallback(
    (target: { id: string; board: string } | null, printId: string, imageUrl: string) =>
      setCards((deck) => setChosenImage(deck, target, printId, imageUrl)),
    []
  );
  const revalidate = useCallback(
    (formatKey?: string) => setCards((deck) => revalidateCards(deck, formatKey)),
    []
  );

  return { cards, setCards, add, changeQuantity, move, remove, chooseImage, revalidate };
};
