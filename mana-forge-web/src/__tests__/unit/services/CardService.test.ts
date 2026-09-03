import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      expect(Array.isArray(cards) || typeof cards === 'object').toBe(true);
    });

    it('lanza error si la API falla', async () => {
      server.use(
        http.get(`${BASE}/cards/banned/:format`, () => new HttpResponse(null, { status: 500 }))
      );
      await expect(CardService.getBannedcards('premodern')).rejects.toThrow();
    });
  });

  describe('getPrintsByOracleId', () => {
    it('obtiene prints usando oracleId proporcionado', async () => {
      server.use(
        http.post(`${BASE}/cards/:id/images`, () =>
          HttpResponse.json([{ id: 'print-1', name: 'Lightning Bolt' }])
        )
      );
      const prints = await CardService.getPrintsByOracleId('card-1', 'oracle-1');
      expect(Array.isArray(prints) || typeof prints === 'object').toBe(true);
    });

    it('obtiene oracleId de la carta si no se proporciona', async () => {
      server.use(
        http.get(`${BASE}/cards/scryfall/:id`, () =>
          HttpResponse.json({ ...mockCard, oracle_id: 'oracle-123' })
        ),
        http.post(`${BASE}/cards/:id/images`, () =>
          HttpResponse.json([{ id: 'print-1' }])
        )
      );
      const prints = await CardService.getPrintsByOracleId('card-1');
      expect(prints).toBeDefined();
    });

    it('lanza error si falla la obtención de prints', async () => {
      server.use(
        http.post(`${BASE}/cards/:id/images`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );
      await expect(CardService.getPrintsByOracleId('card-1', 'oracle-1')).rejects.toThrow();
    });
  });

  describe('batchSearch', () => {
    it('retorna mapa de resultados para múltiples queries', async () => {
      server.use(
        http.post(`${BASE}/cards/scryfall/batch`, () =>
          HttpResponse.json({
            results: [
              { line: 'Lightning Bolt', name: 'Lightning Bolt', id: '1' },
              { line: 'Counterspell', name: 'Counterspell', id: '2' }
            ]
          })
        )
      );
      const results = await CardService.batchSearch(['Lightning Bolt', 'Counterspell']);
      expect(results['Lightning Bolt']).toBeDefined();
      expect(results['Counterspell']).toBeDefined();
    });

    it('mapea resultados por múltiples claves', async () => {
      server.use(
        http.post(`${BASE}/cards/scryfall/batch`, () =>
          HttpResponse.json({
            results: [
              { line: 'Lightning Bolt', name: 'Lightning Bolt', id: '1' }
            ]
          })
        )
      );
      const results = await CardService.batchSearch(['Lightning Bolt']);
      expect(results['Lightning Bolt']).toBeDefined();
      expect(results['lightning bolt']).toBeDefined();
      expect(results['!"Lightning Bolt"']).toBeDefined();
    });

    it('lanza error si la API falla', async () => {
      server.use(
        http.post(`${BASE}/cards/scryfall/batch`, () =>
          new HttpResponse(null, { status: 500 })
        )
      );
      await expect(CardService.batchSearch(['Lightning Bolt'])).rejects.toThrow();
    });
  });
});
