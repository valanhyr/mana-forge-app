import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DeckCard } from '../core/models/Deck';
import type { Format } from '../core/models/Format';
import { DeckService, type DeckAnalysisResult } from '../services/DeckService';
import { toAnalysisPayload, toSavePayload, type AnalysisScores } from '../utils/deck/payloads';

interface SaveContext {
  deckId: string | undefined;
  userId: string | undefined;
  name: string;
  format: Format | null;
  isPrivate: boolean;
  cards: DeckCard[];
  locale: string;
  isDeckValid: boolean;
  analysisResult: DeckAnalysisResult | null;
  onNameMissing: () => void;
  notify: (message: string, kind: 'success' | 'error') => void;
  t: (key: string) => string;
}

export const useDeckSave = (ctx: SaveContext) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [deckScores, setDeckScores] = useState<AnalysisScores | null>(null);

  const save = async (stayOpen = false) => {
    const { format } = ctx;
    if (!ctx.userId || !format) return;
    if (!ctx.name.trim()) {
      ctx.onNameMissing();
      return;
    }
    if (!ctx.isDeckValid) return;

    setIsSaving(true);
    try {
      // Obtain scores from analysis modal, saved state, or auto-generate them
      let scores: AnalysisScores | undefined = ctx.analysisResult?.scores
        ? Object.fromEntries(
            Object.entries(ctx.analysisResult.scores).map(([k, v]) => [
              k,
              { value: v.value, key_cards: v.key_cards ?? [] },
            ])
          )
        : (deckScores ?? undefined);

      if (!scores) {
        const scoreResult = await DeckService.getDeckScores({
          main_deck: toAnalysisPayload({
            cards: ctx.cards,
            format,
            locale: ctx.locale,
            archetypes: [],
          }).main_deck,
          format_name: format.name.en || format.scryfallKey,
          locale: ctx.locale,
        });
        scores = scoreResult.scores;
        setDeckScores(scores ?? null);
      }

      const payload = toSavePayload({
        name: ctx.name,
        format,
        userId: ctx.userId,
        isPrivate: ctx.isPrivate,
        cards: ctx.cards,
        scores,
        cacheKey: Date.now(),
      });

      if (ctx.deckId) {
        await DeckService.updateDeck(ctx.deckId, payload);
        ctx.notify(ctx.t('deckBuilder.deckUpdated'), 'success');
      } else {
        await DeckService.saveDeck(payload);
        ctx.notify(ctx.t('deckBuilder.deckSaved'), 'success');
      }
      if (!stayOpen) navigate('/my-decks');
    } catch (error) {
      console.error('Error al guardar el mazo:', error);
      ctx.notify(ctx.t('deckBuilder.saveDeckError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return { isSaving, deckScores, setDeckScores, save };
};
