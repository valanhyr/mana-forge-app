import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api-client';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();

describe('ApiClient', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); localStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it('includes session credentials and the current language without storing credentials', async () => {
    localStorage.setItem('app_locale', 'es');
    fetchMock.mockResolvedValue(json({ id: 'operator' }));
    await new ApiClient('/api').request('/frontdesk/me');
    expect(fetchMock).toHaveBeenCalledWith('/api/frontdesk/me', expect.objectContaining({ credentials: 'include',
      headers: expect.objectContaining({ 'Accept-Language': 'es' }) }));
    expect(localStorage.length).toBe(1);
  });

  it('obtains fresh CSRF proof before each mutation and never replays a failed write', async () => {
    fetchMock.mockResolvedValueOnce(json({ headerName: 'X-CSRF-TOKEN', token: 'proof-1' }))
      .mockResolvedValueOnce(json({ message: 'SMTP failed' }, 502));
    await expect(new ApiClient().request('/frontdesk/emails', { method: 'POST', body: { body: 'Reply' } })).rejects.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual(['/api/frontdesk/emails', expect.objectContaining({ method: 'POST',
      headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'proof-1' }), body: '{"body":"Reply"}' })]);
  });

  it('does not send a write if CSRF proof cannot be obtained', async () => {
    fetchMock.mockResolvedValue(json({}, 403));
    const client = new ApiClient();
    const failure = vi.fn();
    client.onAccessFailure(failure);
    await expect(client.request('/frontdesk/tickets/t1/status', { method: 'PATCH' })).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(failure).toHaveBeenCalledWith(403);
  });

  it('allows only the explicit login/logout calls to skip CSRF', async () => {
    fetchMock.mockResolvedValue(json({}));
    await new ApiClient().request('/users/login', { method: 'POST', body: { username: 'operator', password: 'secret' }, csrf: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });

  it('notifies session expiry but leaves the session probe to its caller', async () => {
    fetchMock.mockImplementation(async () => json({}, 401));
    const client = new ApiClient();
    const failure = vi.fn();
    const unsubscribe = client.onAccessFailure(failure);
    await expect(client.request('/frontdesk/me')).rejects.toMatchObject({ status: 401 });
    expect(failure).not.toHaveBeenCalled();
    await expect(client.request('/frontdesk/users')).rejects.toMatchObject({ status: 401 });
    expect(failure).toHaveBeenCalledWith(401);
    unsubscribe();
  });

  it('maps only a missing record to null, not authorization or availability failures', async () => {
    const client = new ApiClient();
    fetchMock.mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 403));
    expect(await client.nullable('/frontdesk/tickets/missing')).toBeNull();
    await expect(client.nullable('/frontdesk/tickets/private')).rejects.toBeInstanceOf(ApiError);
  });

  it('encodes queries, accepts explicit page metadata and rejects incompatible API shapes', async () => {
    const client = new ApiClient();
    fetchMock.mockResolvedValueOnce(json({ items: [], page: 2, size: 25, total: 80 })).mockResolvedValueOnce(json([]));
    const result = await client.page('/frontdesk/users', { query: 'name@example.com +', page: 2, size: 25 });
    expect(result.total).toBe(80);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/frontdesk/users?query=name%40example.com+%2B&page=2&size=25');
    await expect(client.page('/frontdesk/users', { page: 0, size: 25 })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('does not silently accept HTML from the reverse proxy or a failed network', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>SPA</html>')).mockRejectedValueOnce(new Error('offline'));
    await expect(new ApiClient().request('/frontdesk/me')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    await expect(new ApiClient().request('/frontdesk/me')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
