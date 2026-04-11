import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ScryfallService } from '../../../services/ScryfallService';
import { mockCard } from '../../mocks/handlers';

const SCRYFALL = 'https://api.scryfall.com';

describe('ScryfallService', () => {
  describe('getCardByName', () => {
    it('retorna la carta cuando la respuesta es exitosa', async () => {
      const card = await ScryfallService.getCardByName('Lightning Bolt');
      expect(card.name).toBe(mockCard.name);
    });

    it('retorna null cuando el servidor responde 404', async () => {
      server.use(
        http.get(`${SCRYFALL}/cards/named`, () => new HttpResponse(null, { status: 404 }))
      );
      const card = await ScryfallService.getCardByName('Carta Inexistente');
      expect(card).toBeNull();
    });

    it('lanza error para fallos HTTP distintos a 404', async () => {
      server.use(
        http.get(`${SCRYFALL}/cards/named`, () => new HttpResponse(null, { status: 500 }))
      );
      await expect(ScryfallService.getCardByName('Lightning Bolt')).rejects.toThrow();
    });
  });

  describe('getCardById', () => {
    it('retorna la carta en caso de éxito', async () => {
      const card = await ScryfallService.getCardById('scryfall-1');
      expect(card.id).toBe(mockCard.id);
    });

    it('retorna null si la respuesta no es ok', async () => {
      server.use(http.get(`${SCRYFALL}/cards/:id`, () => new HttpResponse(null, { status: 404 })));
      const card = await ScryfallService.getCardById('bad-id');
      expect(card).toBeNull();
    });
  });
});
