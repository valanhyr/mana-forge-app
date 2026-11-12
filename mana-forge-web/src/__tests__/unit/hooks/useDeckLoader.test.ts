import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeckLoader, type LoadedDeck } from '../../../hooks/useDeckLoader';
import { DeckService } from '../../../services/DeckService';
import { CardService } from '../../../services/CardService';
import type { Format } from '../../../core/models/Format';

vi.mock('../../../services/DeckService', () => ({ DeckService: { getDeckById: vi.fn() } }));
vi.mock('../../../services/CardService', () => ({ CardService: { getCardById: vi.fn() } }));

const format: Format = {
  id: 'f1',
  name: { en: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

const scryfall = (id: string) => ({
  id,
  name: `Card ${id}`,
  cmc: 1,
  type_line: 'Instant',
  legalities: { premodern: 'legal' },
  image_uris: { normal: `https://img/${id}.jpg` },
});

describe('useDeckLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('hydrates cards, keeps chosen image and reads the private flag', async () => {
    vi.mocked(DeckService.getDeckById).mockResolvedValue({
      name: 'My deck',
      formatId: 'f1',
      private: true,
      analysisScores: { speed: { value: 3, key_cards: [] } },
      cards: [
        { scryfallId: 'a', quantity: 4, board: 'main', chosenImageUrl: 'chosen.jpg', chosenPrintId: 'p1', oracleId: 'o1' },
        { scryfallId: 'b', quantity: 2, board: 'weird' },
        { scryfallId: 'missing', quantity: 1, board: 'side' },
      ],
    } as never);
    vi.mocked(CardService.getCardById).mockImplementation(async (id: string) =>
      id === 'missing' ? null : scryfall(id)
    );

    const onLoaded = vi.fn<(deck: LoadedDeck) => void>();
    const formats = [format];
    renderHook(() => useDeckLoader('deck-1', formats, onLoaded));

    await waitFor(() => expect(onLoaded).toHaveBeenCalledTimes(1));
    const loaded = onLoaded.mock.calls[0][0];
    expect(loaded).toMatchObject({ name: 'My deck', formatId: 'f1', isPrivate: true, format });
    expect(loaded.scores).toEqual({ speed: { value: 3, key_cards: [] } });
    expect(loaded.cards).toHaveLength(2);
    expect(loaded.cards[0]).toMatchObject({
      id: 'a',
      quantity: 4,
      board: 'main',
      image: 'chosen.jpg',
      chosenPrintId: 'p1',
      oracleId: 'o1',
      isValid: true,
    });
    expect(loaded.cards[1].board).toBe('main');
  });

  it('does nothing without a deck id or formats', () => {
    const onLoaded = vi.fn();
    renderHook(() => useDeckLoader(undefined, [format], onLoaded));
    renderHook(() => useDeckLoader('deck-1', [], onLoaded));
    expect(DeckService.getDeckById).not.toHaveBeenCalled();
  });
});
