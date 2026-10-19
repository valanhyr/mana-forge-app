import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ManaSymbolService } from '../../../services/ManaSymbolService';

const BASE = 'http://localhost:8080';

describe('ManaSymbolService', () => {
  beforeEach(() => {
    ManaSymbolService.clearCache();
  });

  it('getAll construye el mapa { símbolo: svg_uri }', async () => {
    const symbols = await ManaSymbolService.getAll();
    expect(symbols['{W}']).toContain('svg');
    expect(symbols['{R}']).toContain('svg');
  });

  it('getAll retorna el mapa cacheado en la segunda llamada (sin segunda petición)', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/cards/symbology`, () => {
        callCount++;
        return HttpResponse.json({ data: [{ symbol: '{W}', svg_uri: 'w.svg' }] });
      })
    );
    await ManaSymbolService.getAll();
    await ManaSymbolService.getAll();
    expect(callCount).toBe(1);
  });

  it('getAll retorna {} si el fetch falla', async () => {
    server.use(http.get(`${BASE}/cards/symbology`, () => new HttpResponse(null, { status: 500 })));
    const symbols = await ManaSymbolService.getAll();
    expect(symbols).toEqual({});
  });

  it('getAll reintenta tras un fallo en lugar de quedarse con {} para siempre', async () => {
    let call = 0;
    server.use(
      http.get(`${BASE}/cards/symbology`, () => {
        call++;
        if (call === 1) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ data: [{ symbol: '{R}', svg_uri: 'r.svg' }] });
      })
    );
    expect(await ManaSymbolService.getAll()).toEqual({});
    expect((await ManaSymbolService.getAll())['{R}']).toBe('r.svg');
    expect(call).toBe(2);
  });

  it('getAll no cachea una respuesta sin símbolos', async () => {
    let call = 0;
    server.use(
      http.get(`${BASE}/cards/symbology`, () => {
        call++;
        if (call === 1) return HttpResponse.json({ object: 'list', data: [] });
        return HttpResponse.json({ data: [{ symbol: '{G}', svg_uri: 'g.svg' }] });
      })
    );
    expect(await ManaSymbolService.getAll()).toEqual({});
    expect((await ManaSymbolService.getAll())['{G}']).toBe('g.svg');
  });

  it('getAll - llamadas concurrentes comparten la misma Promise (sin peticiones duplicadas)', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/cards/symbology`, () => {
        callCount++;
        return HttpResponse.json({ data: [] });
      })
    );
    await Promise.all([
      ManaSymbolService.getAll(),
      ManaSymbolService.getAll(),
      ManaSymbolService.getAll(),
    ]);
    expect(callCount).toBe(1);
  });
});
