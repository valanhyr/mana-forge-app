import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { CardService } from '../../../services/CardService';
import { mockCard } from '../../mocks/handlers';

const BASE = 'http://localhost:8080';

describe('CardService', () => {
  describe('autocomplete', () => {
    it('retorna [] si la query tiene menos de 3 caracteres', async () => {
      const result = await CardService.autocomplete('li');
      expect(result).toEqual([]);
    });

    it('retorna [] si la query está vacía', async () => {
      expect(await CardService.autocomplete('')).toEqual([]);
    });

    it('retorna array de strings en caso de éxito', async () => {
      const result = await CardService.autocomplete('lightning');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('retorna [] si la API falla', async () => {
      server.use(
        http.get(`${BASE}/cards/autocomplete`, () => new HttpResponse(null, { status: 500 }))
      );
      const result = await CardService.autocomplete('lightning');
      expect(result).toEqual([]);
    });
  });

  describe('getCardByName', () => {
    it('retorna el primer resultado de la búsqueda exacta', async () => {
      const card = await CardService.getCardByName('Lightning Bolt');
      expect(card.name).toBe(mockCard.name);
    });

    it('hace búsqueda general si la exacta no devuelve resultados', async () => {
      server.use(
        http.get(`${BASE}/cards/scryfall`, ({ request }) => {
          const url = new URL(request.url);
          const q = url.searchParams.get('q') ?? '';
          // Exacta (comillas): devuelve vacío; general: devuelve card
          if (q.startsWith('!"')) {
            return HttpResponse.json({ data: [] });
          }
          return HttpResponse.json({ data: [mockCard] });
        })
      );
      const card = await CardService.getCardByName('Bosque');
      expect(card.name).toBe(mockCard.name);
    });

    it('lanza error si no se encuentran resultados', async () => {
      server.use(http.get(`${BASE}/cards/scryfall`, () => HttpResponse.json({ data: [] })));
      await expect(CardService.getCardByName('XYZNonExistent')).rejects.toThrow();
    });
  });

  describe('getCardById', () => {
    it('retorna la carta en caso de éxito', async () => {
      const card = await CardService.getCardById('scryfall-1');
      expect(card.id).toBe(mockCard.id);
    });

    it('lanza error si la carta no existe', async () => {
      server.use(
        http.get(`${BASE}/cards/scryfall/:id`, () => new HttpResponse(null, { status: 404 }))
      );
      await expect(CardService.getCardById('bad-id')).rejects.toThrow();
    });
  });

  describe('getBannedCards', () => {
    it('retorna lista de cartas baneadas para un formato', async () => {
      const cards = await CardService.getBannedcards('premodern');
      expect(Array.isArray(cards)).toBe(true);
    });

    it('lanza error si la API falla', async () => {
      server.use(
        http.get(`${BASE}/cards/banned/:format`, () => new HttpResponse(null, { status: 500 }))
      );
      await expect(CardService.getBannedcards('premodern')).rejects.toThrow();
    });
  });
});
