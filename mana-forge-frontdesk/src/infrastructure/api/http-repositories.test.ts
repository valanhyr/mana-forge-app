import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceContainer } from '../container';
import { ApiClient } from './api-client';
import { HttpAuthService, HttpTicketRepository } from './http-repositories';

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const proof = { headerName: 'X-CSRF-TOKEN', token: 'csrf' };

describe('HTTP adapters', () => {
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); localStorage.clear(); });
  afterEach(() => vi.unstubAllGlobals());

  it('selects live repositories explicitly without reading or writing seed storage', async () => {
    const services = new ServiceContainer({ useMocks: false });
    fetchMock.mockResolvedValue(json({ items: [], page: 0, size: 25, total: 0 }));
    expect(services.ticketRepo).toBeInstanceOf(HttpTicketRepository);
    expect((await services.userRepo.searchPage('', { page: 0, size: 25 })).items).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it('gets paginated summaries and then the full conversation from the detail endpoint', async () => {
    const services = new ServiceContainer({ useMocks: false });
    fetchMock.mockResolvedValueOnce(json({ items: [{ id: 't1', messages: [] }], page: 1, size: 25, total: 30 }))
      .mockResolvedValueOnce(json({ id: 't1', messages: [{ content: 'Full conversation' }] }));
    expect((await services.ticketRepo.listPage({ category: 'ACCOUNT' }, { page: 1, size: 25 })).total).toBe(30);
    const ticket = await services.ticketRepo.getById('t1');
    expect(ticket?.messages[0].content).toBe('Full conversation');
    expect(fetchMock.mock.calls[0][0]).toContain('category=ACCOUNT');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/frontdesk/tickets/t1');
  });

  it('omits forged authors and operator names from mutation bodies', async () => {
    const services = new ServiceContainer({ useMocks: false });
    fetchMock.mockImplementation(async input => String(input).endsWith('/csrf') ? json(proof) : json({ id: 't1' }));
    await services.ticketRepo.addMessage('t1', { sender: 'SYSTEM', senderName: 'Forged', content: 'Private note', isInternalNote: true });
    await services.ticketRepo.assignOperator('t1', 'op1', 'Forged name');
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toEqual({ content: 'Private note', isInternalNote: true });
    expect(JSON.parse(fetchMock.mock.calls[3][1]!.body as string)).toEqual({ operatorId: 'op1' });
  });

  it('preserves daily quota, unknown dates and unknown historical statistics', async () => {
    fetchMock.mockResolvedValue(json({ id: 'u1', createdAt: null, lastLoginAt: null,
      stats: { aiQuotaPeriod: 'DAILY', aiQueriesToday: 4, aiQueriesThisMonth: null, failedImportsCount: null } }));
    const user = await new ServiceContainer({ useMocks: false }).userRepo.getById('u1');
    expect(user?.stats.aiQueriesToday).toBe(4);
    expect(user?.stats.aiQueriesThisMonth).toBeNull();
    expect(user?.createdAt).toBeNull();
  });

  it('does not attempt unsupported campaigns or append arbitrary audit events', async () => {
    const services = new ServiceContainer({ useMocks: false });
    await expect(services.emailService.sendBroadcast({ audience: 'ALL', subject: 'Hello', body: 'Body' })).rejects.toMatchObject({ status: 501 });
    await expect(services.auditRepo.logEvent({ actor: { id: 'fake', name: 'Fake', role: 'SYSTEM' }, action: 'EMAIL_SENT', details: 'Fake event' }))
      .rejects.toMatchObject({ status: 405 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('queries consenting subscribers and sends selected IDs with CSRF and a stable campaign ID', async () => {
    const email = new ServiceContainer({ useMocks: false }).emailService;
    fetchMock.mockResolvedValueOnce(json({ items: [{ id: 'u1' }], page: 0, size: 25, total: 1 }))
      .mockResolvedValueOnce(json(proof)).mockResolvedValueOnce(json({ id: 'c1', state: 'RUNNING', total: 1 }));
    await email.listSubscribers('customer', 'FREE', { page: 0, size: 25 });
    expect(fetchMock.mock.calls[0][0]).toContain('/newsletter/subscribers?query=customer&tier=FREE');
    const payload = { campaignId: 'c1', recipientIds: ['u1'], subject: 'News', body: 'Body' };
    await email.sendNewsletter(payload);
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string)).toEqual(payload);
    expect(fetchMock.mock.calls[2][1]!.headers).toMatchObject({ 'X-CSRF-TOKEN': 'csrf' });
  });

  it('exposes SMTP attempt metadata but not the recipient ciphertext', async () => {
    fetchMock.mockResolvedValue(json({ items: [{ id: 'd1', recipientName: 'Customer', recipientEmail: 'CIPHERTEXT',
      subject: 'Support', status: 'FAILED', createdAt: '2026-10-08', sentAt: null, messageId: null }], page: 0, size: 25, total: 1 }));
    const page = await new ServiceContainer({ useMocks: false }).emailService.listDeliveries({ page: 0, size: 25 });
    expect(page.items[0].status).toBe('FAILED');
    expect(page.items[0]).not.toHaveProperty('recipientEmail');
  });

  it('loads actual templates and sends the render variables to the API', async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 'tpl1', title: 'Directus template' }]))
      .mockResolvedValueOnce(json(proof)).mockResolvedValueOnce(json({ subject: 'Hello Customer', body: 'Hi' }));
    const email = new ServiceContainer({ useMocks: false }).emailService;
    expect((await email.listTemplates())[0].title).toBe('Directus template');
    await email.renderTemplate('tpl1', { 'user.name': 'Customer' });
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string)).toEqual({ variables: { 'user.name': 'Customer' } });
  });

  it('requires a verified operator response after login, not just a successful user login', async () => {
    const auth = new HttpAuthService(new ApiClient());
    fetchMock.mockResolvedValueOnce(json({ userId: 'regular-user' })).mockResolvedValueOnce(json({}, 403));
    await expect(auth.signIn('regular-user', 'password')).rejects.toMatchObject({ status: 403 });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/frontdesk/me');
  });

  it('clears local session state if logout finds an already expired session', async () => {
    const client = new ApiClient();
    const ended = vi.fn();
    client.onAccessFailure(ended);
    fetchMock.mockResolvedValue(json({}, 401));
    await new HttpAuthService(client).signOut();
    expect(ended).toHaveBeenCalledWith(401);
  });
});
