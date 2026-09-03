import { describe, it, expect, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { FormatService } from '../../../services/FormatService';

const BASE = 'http://localhost:8080';

describe('FormatService - Extended', () => {
  afterEach(() => {
    FormatService.clearCache();
  });

  describe('getActiveFormats with cache', () => {
    it('retorna formatos activos', async () => {
      server.use(
        http.get(`${BASE}/formats/active`, () =>
          HttpResponse.json([
            { id: '1', name: { en: 'Premodern', es: 'Premodern' } },
            { id: '2', name: { en: 'Standard', es: 'Estándar' } },
          ])
        )
      );

      const result = await FormatService.getActiveFormats();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });

    it('usa caché en segundo llamado sin hacer nueva petición', async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/formats/active`, () => {
          callCount++;
          return HttpResponse.json([{ id: '1', name: 'Premodern' }]);
        })
      );

      const result1 = await FormatService.getActiveFormats();
      const result2 = await FormatService.getActiveFormats();

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(callCount).toBe(1); // Solo una llamada debido al caché
    });

    it('retorna [] si el servidor falla', async () => {
      server.use(http.get(`${BASE}/formats/active`, () => new HttpResponse(null, { status: 500 })));
      const result = await FormatService.getActiveFormats();
      expect(result).toEqual([]);
    });
  });

  describe('getCMSFormatDetail', () => {
    it('obtiene detalle de formato por ID', async () => {
      server.use(
        http.get(`${BASE}/formats/premodern-id`, () =>
          HttpResponse.json({ id: 'premodern-id', name: 'Premodern' })
        )
      );

      const result = await FormatService.getCMSFormatDetail('premodern-id');
      expect(result.id).toBe('premodern-id');
    });

    it('retorna objeto vacío si la API falla', async () => {
      server.use(http.get(`${BASE}/formats/:id`, () => new HttpResponse(null, { status: 404 })));
      const result = await FormatService.getCMSFormatDetail('nonexistent');
      expect(result).toEqual({});
    });
  });

  describe('getCMSAllFormats', () => {
    it('obtiene todos los formatos del CMS', async () => {
      server.use(
        http.get(`${BASE}/formats`, () =>
          HttpResponse.json({
            data: [
              { id: '1', name: 'Premodern' },
              { id: '2', name: 'Standard' },
            ],
          })
        )
      );

      const result = await FormatService.getCMSAllFormats();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(2);
    });

    it('retorna objeto vacío si falla la API', async () => {
      server.use(http.get(`${BASE}/formats`, () => new HttpResponse(null, { status: 500 })));
      const result = await FormatService.getCMSAllFormats();
      expect(result).toEqual({});
    });
  });

  describe('clearCache', () => {
    it('limpia el caché de formatos', async () => {
      let callCount = 0;
      server.use(
        http.get(`${BASE}/formats/active`, () => {
          callCount++;
          return HttpResponse.json([{ id: String(callCount), name: `Format ${callCount}` }]);
        })
      );

      const result1 = await FormatService.getActiveFormats();
      FormatService.clearCache();
      const result2 = await FormatService.getActiveFormats();

      expect(result1[0].id).toBe('1');
      expect(result2[0].id).toBe('2');
      expect(callCount).toBe(2);
    });
  });
});
