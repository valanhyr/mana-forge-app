import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { FormatService } from '../../../services/FormatService';

const BASE = 'http://localhost:8080';

describe('FormatService', () => {
  beforeEach(() => {
    FormatService.clearCache();
  });

  it('getActiveFormats retorna los formatos de la API', async () => {
    const formats = await FormatService.getActiveFormats();
    expect(Array.isArray(formats)).toBe(true);
    expect(formats[0].id).toBe('fmt-1');
  });

  it('getActiveFormats retorna datos cacheados en la segunda llamada (sin segunda petición)', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/formats/active`, () => {
        callCount++;
        return HttpResponse.json([
          {
            id: 'fmt-1',
            name: { es: 'Premoderno' },
            scryfallKey: 'premodern',
            config: {},
            isActive: true,
          },
        ]);
      })
    );
    await FormatService.getActiveFormats();
    await FormatService.getActiveFormats();
    expect(callCount).toBe(1);
  });

  it('getActiveFormats retorna [] si la API falla', async () => {
    server.use(http.get(`${BASE}/formats/active`, () => new HttpResponse(null, { status: 500 })));
    const formats = await FormatService.getActiveFormats();
    expect(formats).toEqual([]);
  });

  it('clearCache invalida la caché (siguiente llamada hace nueva petición)', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/formats/active`, () => {
        callCount++;
        return HttpResponse.json([]);
      })
    );
    await FormatService.getActiveFormats();
    FormatService.clearCache();
    await FormatService.getActiveFormats();
    expect(callCount).toBe(2);
  });

  it('getCMSFormatDetail retorna el detalle del formato', async () => {
    const detail = await FormatService.getCMSFormatDetail('fmt-1');
    expect(detail).toHaveProperty('mongoId');
  });

  it('getCMSAllFormats retorna todos los formatos', async () => {
    const result = await FormatService.getCMSAllFormats();
    expect(result).toHaveProperty('mongoId');
  });
});
