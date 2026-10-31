import { useRef, useState } from 'react';
import type { DeckCard } from '../core/models/Deck';
import { CardService } from '../services/CardService';
import { scryfallToDeckCard } from '../utils/deck/scryfallToDeckCard';

export const useCardSearch = (formatKey: string | undefined, onAdd: (cards: DeckCard[]) => void) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 3) {
      debounceRef.current = setTimeout(async () => {
        setSuggestions(await CardService.autocomplete(value));
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const addByName = async (cardName: string) => {
    setSuggestions([]);
    setQuery('');
    try {
      const cardData = await CardService.getCardByName(cardName);
      if (!cardData) throw new Error(`Card not found: ${cardName}`);
      onAdd([scryfallToDeckCard(cardData, { formatKey, board: 'main', quantity: 1 })]);
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  return { query, suggestions, onChange, addByName };
};
