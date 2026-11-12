import { useState } from 'react';
import type { DeckBoard, DeckCard } from '../core/models/Deck';
import { CardService } from '../services/CardService';
import { scryfallToDeckCard } from '../utils/deck/scryfallToDeckCard';

export const useCardPreview = (input: {
  cards: DeckCard[];
  formatKey: string | undefined;
  onAdd: (cards: DeckCard[]) => void;
  notify: (message: string, kind: 'success' | 'error') => void;
}) => {
  const { cards, formatKey, onAdd, notify } = input;
  const [isOpen, setIsOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [cardName, setCardName] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(false);

  const loadImage = async (name: string, imageSrc?: string) => {
    if (cache[name]) {
      setImage(cache[name]);
      return;
    }
    if (imageSrc) {
      setCache((prev) => ({ ...prev, [name]: imageSrc }));
      setImage(imageSrc);
      return;
    }

    try {
      setIsFetching(true);
      const details = await CardService.getCardByName(name);
      const url = details.image_uris?.normal || details.card_faces?.[0]?.image_uris?.normal;
      if (url) {
        setCache((prev) => ({ ...prev, [name]: url }));
        setImage(url);
      }
    } catch (error) {
      console.error('Error fetching card image for preview:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const previewDeckCard = async (name: string) => {
    const inDeck = cards.find((c) => c.name === name);
    await loadImage(name, inDeck?.image);
    setCardName(name);
    setIsOpen(true);
  };

  const previewSuggestion = async (name: string) => {
    setImage(null);
    setCardName(name);
    setIsOpen(true);
    await loadImage(name);
  };

  const addSuggestion = async (name: string, board: Exclude<DeckBoard, 'commander'>) => {
    try {
      const cardData = await CardService.getCardByName(name);
      onAdd([scryfallToDeckCard(cardData, { formatKey, board, quantity: 1 })]);
      setIsOpen(false);
      notify(`${cardData.name} → ${board}`, 'success');
    } catch (error) {
      console.error('Error adding suggested card:', error);
      notify('Error al añadir la carta', 'error');
    }
  };

  return {
    isOpen,
    close: () => setIsOpen(false),
    image,
    cardName,
    isFetching,
    loadImage,
    previewDeckCard,
    previewSuggestion,
    addSuggestion,
  };
};
