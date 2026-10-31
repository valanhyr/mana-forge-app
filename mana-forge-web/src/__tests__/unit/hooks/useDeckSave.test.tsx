import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useDeckSave } from '../../../hooks/useDeckSave';
import { DeckService } from '../../../services/DeckService';
import type { DeckCard } from '../../../core/models/Deck';
import type { Format } from '../../../core/models/Format';

vi.mock('../../../services/DeckService', () => ({
  DeckService: { getDeckScores: vi.fn(), saveDeck: vi.fn(), updateDeck: vi.fn() },
}));

const format: Format = {
  id: 'f2',
  name: { en: 'Commander' },
  scryfallKey: 'commander',
  config: { minMainDeck: 99, maxMainDeck: 100, maxSideboard: 0, maxCopies: 1 },
  isActive: true,
};

const cards: DeckCard[] = [
  { id: 'a', name: 'Mountain', quantity: 99, type: 'Basic Land', board: 'main' },
  { id: 'b', name: 'Purphoros', quantity: 1, type: 'Legendary Creature', board: 'commander' },
];

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useDeckSave scores payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(DeckService.getDeckScores).mockResolvedValue({ scores: {} });
    vi.mocked(DeckService.saveDeck).mockResolvedValue({ id: 'new' } as never);
  });

  it('sends the commander to the score request', async () => {
    const { result } = renderHook(
      () =>
        useDeckSave({
          deckId: undefined,
          userId: 'u1',
          name: 'EDH',
          format,
          isPrivate: false,
          cards,
          locale: 'es',
          isDeckValid: true,
          analysisResult: null,
          onNameMissing: () => undefined,
          notify: () => undefined,
          t: (key: string) => key,
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.save(true);
    });

    expect(DeckService.getDeckScores).toHaveBeenCalledWith(
      expect.objectContaining({
        main_deck: [
          { name: 'Purphoros', quantity: 1 },
          { name: 'Mountain', quantity: 99 },
        ],
      })
    );
  });
});
