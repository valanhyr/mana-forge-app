import { PageResult } from '../../core/domain/page';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  csrf?: boolean;
}

export class ApiClient {
  private readonly accessListeners = new Set<(status: number) => void>();

  constructor(public readonly baseUrl = '/api') {}

  onAccessFailure(listener: (status: number) => void) {
    this.accessListeners.add(listener);
    return () => { this.accessListeners.delete(listener); };
  }

  endSession() { this.accessListeners.forEach(listener => listener(401)); }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const headers: Record<string, string> = { Accept: 'application/json' };
    let locale: string | null = null;
    try { locale = typeof localStorage !== 'undefined' ? localStorage.getItem('app_locale') : null; }
    catch { /* A blocked preferences store must not prevent session-based API access. */ }
    headers['Accept-Language'] = locale === 'es' ? 'es' : 'en';
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET' && options.csrf !== false) {
      // Refresh proof before each operation, but never replay a failed mutation (especially email).
      const proof = await this.request<{ headerName: string; token: string }>('/frontdesk/csrf');
      if (!proof || proof.headerName !== 'X-CSRF-TOKEN' || !proof.token) throw new ApiError(0, 'Invalid CSRF response', 'INVALID_RESPONSE');
      headers[proof.headerName] = proof.token;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    let text: string;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method, headers, credentials: 'include', signal: controller.signal,
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      });
      text = await response.text();
    } catch {
      throw new ApiError(0, 'Unable to reach the API', controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
    }

    let data: unknown;
    if (text) {
      try { data = JSON.parse(text); } catch { /* HTML/error pages are not trusted API messages. */ }
    }
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && path.startsWith('/frontdesk/') && path !== '/frontdesk/me') {
        this.accessListeners.forEach(listener => listener(response.status));
      }
      const error = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      throw new ApiError(response.status,
        typeof error.message === 'string' ? error.message : typeof error.error === 'string' ? error.error : `API error (${response.status})`,
        typeof error.code === 'string' ? error.code : undefined);
    }
    if (response.status === 204 || !text) return undefined as T;
    if (data === undefined) throw new ApiError(0, 'Invalid API response', 'INVALID_RESPONSE');
    return data as T;
  }

  async page<T>(path: string, filters: Record<string, string | number | undefined>): Promise<PageResult<T>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const result = await this.request<PageResult<T>>(`${path}?${params.toString()}`);
    if (!result || !Array.isArray(result.items) || !Number.isInteger(result.page) || !Number.isInteger(result.size)
      || !Number.isFinite(result.total) || result.total < 0 || result.size < 1 || result.size > 100) {
      throw new ApiError(0, 'Invalid paginated API response', 'INVALID_RESPONSE');
    }
    return result;
  }

  async nullable<T>(path: string): Promise<T | null> {
    try { return await this.request<T>(path); }
    catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }
}
