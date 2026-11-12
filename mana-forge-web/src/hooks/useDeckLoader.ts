import { useEffect, useState } from 'react';
import type { DeckBoard, DeckCard } from '../core/models/Deck';
import type { Format } from '../core/models/Format';
import { CardService } from '../services/CardService';
import { DeckService } from '../services/DeckService';
import { scryfallToDeckCard } from '../utils/deck/scryfallToDeckCard';
import type { AnalysisScores } from '../utils/deck/payloads';

const BOARDS: readonly DeckBoard[] = ['main', 'side', 'commander', 'maybe'];

export interface LoadedDeck {
  name: string;
  formatId: string;
  format: Format | null;
  isPrivate: boolean;
  cards: DeckCard[];
  scores: AnalysisScores | null;
}

export const useDeckLoader = (
  deckId: string | undefined,
  formats: Format[],
  onLoaded: (deck: LoadedDeck) => void
) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!deckId || formats.length === 0) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const deck = await DeckService.getDeckById(deckId);
        const format = formats.find((f) => f.id === deck.formatId) || null;

        const hydrated = await Promise.all(
          (deck.cards || []).map(async (entry: Record<string, unknown>) => {
            try {
              const scryfallId = entry.scryfallId as string | undefined;
              const cardData = scryfallId
                ? ((await CardService.getCardById(scryfallId)) as Record<string, unknown> | null)
                : null;
              if (!cardData) throw new Error('Card data not found');

              const boardValue = (entry.board as string) || 'main';
              const board = BOARDS.includes(boardValue as DeckBoard)
                ? (boardValue as DeckBoard)
                : 'main';

              return scryfallToDeckCard(cardData, {
                formatKey: format?.scryfallKey,
                board,
                quantity: (entry.quantity as number) || 1,
                imageUrl: (entry.chosenImageUrl as string | undefined) || undefined,
                chosenPrintId: (entry.chosenPrintId as string) || undefined,
                oracleId: (entry.oracleId as string) || undefined,
              });
            } catch (err) {
              console.error(`Error cargando carta ${(entry.scryfallId as string) || 'unknown'}:`, err);
              return null;
            }
          })
        );

        const raw = deck as unknown as Record<string, unknown>;
        onLoaded({
          name: deck.name,
          formatId: deck.formatId,
          format,
          // Jackson serializa 'isPrivate' como 'private' por defecto
          isPrivate: (raw.private as boolean) ?? (raw.isPrivate as boolean) ?? false,
          cards: hydrated.filter((c): c is DeckCard => c !== null),
          scores: deck.analysisScores ?? null,
        });
      } catch (error) {
        console.error('Error loading deck:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // onLoaded is a stable setter bundle owned by the caller; reload only on deck or format changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, formats]);

  return { isLoading };
};
