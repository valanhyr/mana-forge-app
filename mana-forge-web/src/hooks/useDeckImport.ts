import { useState } from 'react';
import type { DeckCard } from '../core/models/Deck';
import { CardService } from '../services/CardService';
import { findInBatch } from '../utils/scryfallHelpers';
import { parseDecklist, sanitizeDecklistText } from '../utils/decklistParser';
import { scryfallToDeckCard } from '../utils/deck/scryfallToDeckCard';

export interface ImportResult {
  successCount: number;
  failures: string[];
}

export const useDeckImport = (formatKey: string | undefined, onCards: (cards: DeckCard[]) => void) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const runImport = async () => {
    const failed: string[] = [];
    const cards: DeckCard[] = [];

    setIsOpen(false);
    setText('');
    setErrors([]);

    setIsImporting(true);
    try {
      // Resolve every card name in a single backend round-trip.
      const parsed = parseDecklist(sanitizeDecklistText(text));
      const names = parsed.map((l) => l.name);
      const batch = names.length > 0 ? await CardService.batchSearch(names) : {};

      for (const entry of parsed) {
        const cardData = findInBatch(batch, entry.name);
        if (!cardData) {
          failed.push(`${entry.quantity} ${entry.name}`);
          continue;
        }
        cards.push(
          scryfallToDeckCard(cardData, {
            formatKey,
            board: entry.board === 'side' ? 'side' : entry.board === 'maybe' ? 'maybe' : 'main',
            quantity: entry.quantity,
          })
        );
      }
      if (cards.length > 0) onCards(cards);
      setErrors(failed);
      setResult({ successCount: cards.length, failures: failed });
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    text,
    setText,
    errors,
    clearErrors: () => setErrors([]),
    result,
    clearResult: () => setResult(null),
    isImporting,
    runImport,
  };
};
