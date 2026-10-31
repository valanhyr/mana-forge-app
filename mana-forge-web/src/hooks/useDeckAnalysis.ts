import { useEffect, useState } from 'react';
import type { DeckCard } from '../core/models/Deck';
import type { Format } from '../core/models/Format';
import { DeckService, type DeckAnalysisResult } from '../services/DeckService';
import { archetypesForFormat } from '../utils/deck/archetypes';
import { toAnalysisPayload } from '../utils/deck/payloads';

export const useDeckAnalysis = (input: {
  cards: DeckCard[];
  format: Format | null;
  locale: string;
  isDeckValid: boolean;
}) => {
  const { cards, format, locale, isDeckValid } = input;
  const [archetypes, setArchetypes] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DeckAnalysisResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (format) setArchetypes(archetypesForFormat(format.scryfallKey));
  }, [format]);

  const analyze = async () => {
    if (!isDeckValid || !format) return;
    setIsAnalyzing(true);
    try {
      const payload = toAnalysisPayload({ cards, format, locale, archetypes });
      // La llamada pasa por nuestra API de backend, que actúa como proxy
      const data = await DeckService.analyzeDeck(payload);
      setResult(data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error analizando mazo:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    result,
    isAnalyzing,
    isModalOpen,
    closeModal: () => setIsModalOpen(false),
    analyze,
  };
};
