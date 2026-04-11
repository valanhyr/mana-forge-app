import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { DeckService } from '../../../services/DeckService';

const BASE = 'http://localhost:8080';

describe('DeckService', () => {
  describe('getDailyDeck', () => {
    it('llama POST /decks/random con el locale', async () => {
      const result = await DeckService.getDailyDeck('es');
      expect(result).toHaveProperty('main_deck');
    });
  });

  describe('rateDailyDeck', () => {
    it('llama POST /decks/random/rate con date y stars', async () => {
      const result = await DeckService.rateDailyDeck('2026-04-11', 5);
      expect(result).toHaveProperty('deck_name');
    });
  });

  describe('getFeaturedDeck', () => {
    it('retorna el deck destacado en caso de éxito', async () => {
      const deck = await DeckService.getFeaturedDeck();
      expect(deck).not.toBeNull();
      expect(deck?.id).toBe('deck-1');
    });

    it('retorna null si la API falla', async () => {
      server.use(http.get(`${BASE}/decks/featured`, () => new HttpResponse(null, { status: 500 })));
      const deck = await DeckService.getFeaturedDeck();
      expect(deck).toBeNull();
    });
  });

  describe('getDeckView', () => {
    it('retorna el DeckView en caso de éxito', async () => {
      const view = await DeckService.getDeckView('deck-1');
      expect(view?.id).toBe('deck-1');
    });

    it('retorna null si la API falla', async () => {
      server.use(http.get(`${BASE}/decks/:id/view`, () => new HttpResponse(null, { status: 404 })));
      const view = await DeckService.getDeckView('bad-id');
      expect(view).toBeNull();
    });
  });

  describe('saveDeck', () => {
    it('llama POST /decks y retorna el deck creado', async () => {
      const payload = {
        name: 'New Deck',
        formatId: 'fmt-1',
        userId: 'user-1',
        isPrivate: false,
        cards: [],
      };
      const result = await DeckService.saveDeck(payload);
      expect(result).toHaveProperty('id');
    });
  });

  describe('updateDeck', () => {
    it('llama PUT /decks/:id y retorna el deck actualizado', async () => {
      const payload = {
        name: 'Updated Deck',
        formatId: 'fmt-1',
        userId: 'user-1',
        isPrivate: false,
        cards: [],
      };
      const result = await DeckService.updateDeck('deck-1', payload);
      expect(result).toHaveProperty('id');
    });
  });

  describe('deleteDeck', () => {
    it('llama DELETE /decks/:id sin lanzar error', async () => {
      await expect(DeckService.deleteDeck('deck-1')).resolves.toBeUndefined();
    });
  });

  describe('likeDeck / unlikeDeck', () => {
    it('likeDeck retorna likesCount y likedByMe', async () => {
      const result = await DeckService.likeDeck('deck-1');
      expect(result.likesCount).toBe(1);
      expect(result.likedByMe).toBe(true);
    });

    it('unlikeDeck retorna likedByMe false', async () => {
      const result = await DeckService.unlikeDeck('deck-1');
      expect(result.likedByMe).toBe(false);
    });
  });

  describe('cloneDeck', () => {
    it('llama POST /decks/:id/clone y retorna el nuevo deck', async () => {
      const result = await DeckService.cloneDeck('deck-1');
      expect(result.id).toBe('deck-2');
    });
  });

  describe('pinDeck / unpinDeck', () => {
    it('pinDeck llama POST /decks/:id/pin', async () => {
      const result = await DeckService.pinDeck('deck-1');
      expect(result).toHaveProperty('id');
    });

    it('unpinDeck llama DELETE /decks/:id/pin', async () => {
      const result = await DeckService.unpinDeck('deck-1');
      expect(result).toHaveProperty('id');
    });
  });

  describe('searchDecks', () => {
    it('retorna array de resultados', async () => {
      const results = await DeckService.searchDecks({ name: 'sligh' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('pasa filtros como query params', async () => {
      let capturedUrl = '';
      server.use(
        http.get(`${BASE}/decks/search`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json([]);
        })
      );
      await DeckService.searchDecks({ name: 'burn', formatId: 'fmt-1' });
      expect(capturedUrl).toContain('name=burn');
      expect(capturedUrl).toContain('formatId=fmt-1');
    });
  });
});
