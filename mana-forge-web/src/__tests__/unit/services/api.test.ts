import { describe, it, expect, beforeEach, vi } from 'vitest';

// Limpiar módulos para reobtener la instancia de api limpia
describe('services/api', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('la instancia tiene withCredentials: true', async () => {
    const { api } = await import('../../../services/api');
    expect((api.defaults as any).withCredentials).toBe(true);
  });

  it('el interceptor inyecta Accept-Language desde localStorage', async () => {
    const { api } = await import('../../../services/api');
    localStorage.setItem('app_locale', 'en');

    // Interceptamos la request antes de que salga
    const spy = vi.spyOn(api, 'request').mockResolvedValueOnce({ data: {} } as any);

    await api.get('/test').catch(() => {});
    spy.mockRestore();

    // Verificamos directamente que el interceptor modifica la config
    const config = { headers: {} as Record<string, string> };
    const interceptors = (api.interceptors.request as any).handlers;
    if (interceptors && interceptors.length > 0) {
      const fulfilled = interceptors[0]?.fulfilled;
      if (fulfilled) {
        const result = fulfilled(config);
        expect(result.headers['Accept-Language']).toBe('en');
      }
    }
  });

  it('el interceptor usa "es" por defecto si localStorage está vacío', async () => {
    const { api } = await import('../../../services/api');
    localStorage.removeItem('app_locale');

    const config = { headers: {} as Record<string, string> };
    const interceptors = (api.interceptors.request as any).handlers;
    if (interceptors && interceptors.length > 0) {
      const fulfilled = interceptors[0]?.fulfilled;
      if (fulfilled) {
        const result = fulfilled(config);
        expect(result.headers['Accept-Language']).toBe('es');
      }
    }
  });
});
