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
    expect((await services.userRepo.searchPage({ query: '' }, { page: 0, size: 25 })).items).toEqual([]);
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

  it('sends directory ordering and filters, omitting empty values', async () => {
    const users = new ServiceContainer({ useMocks: false }).userRepo;
    fetchMock.mockResolvedValueOnce(json({ items: [], page: 1, size: 25, total: 0 }));
    await users.searchPage({
      query: 'urza', sort: 'openTickets', dir: 'desc', tier: 'PRO', status: 'ACTIVE', quota: 'exhausted',
    }, { page: 1, size: 25 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/frontdesk/users?');
    expect(url).toContain('query=urza');
    expect(url).toContain('sort=openTickets');
    expect(url).toContain('dir=desc');
    expect(url).toContain('tier=PRO');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('quota=exhausted');
    expect(url).toContain('page=1');
    expect(url).not.toContain('undefined');
  });

  it('does not send directory filters the operator did not choose', async () => {
    const users = new ServiceContainer({ useMocks: false }).userRepo;
    fetchMock.mockResolvedValueOnce(json({ items: [], page: 0, size: 25, total: 0 }));
    await users.searchPage({ query: '', sort: 'username', dir: 'asc' }, { page: 0, size: 25 });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).not.toContain('tier=');
    expect(url).not.toContain('status=');
    expect(url).not.toContain('quota=');
  });

  it('preserves daily quota, unknown dates and unknown historical statistics', async () => {
    fetchMock.mockResolvedValue(json({ id: 'u1', createdAt: null, lastLoginAt: null,
      stats: { aiQuotaPeriod: 'DAILY', aiQueriesToday: 4, aiQueriesThisMonth: null, failedImportsCount: null } }));
    const user = await new ServiceContainer({ useMocks: false }).userRepo.getById('u1');
    expect(user?.stats.aiQueriesToday).toBe(4);
    expect(user?.stats.aiQueriesThisMonth).toBeNull();
    expect(user?.createdAt).toBeNull();
    expect(user?.updatedAt).toBeNull();
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

  it('queries every eligible user and sends announcements to their own endpoints with CSRF', async () => {
    const email = new ServiceContainer({ useMocks: false }).emailService;
    fetchMock.mockResolvedValueOnce(json({ items: [{ id: 'u1' }], page: 0, size: 25, total: 1 }))
      .mockResolvedValueOnce(json(proof)).mockResolvedValueOnce(json({ id: 'a1', state: 'RUNNING', total: 1 }))
      .mockResolvedValueOnce(json({ id: 'a1', state: 'COMPLETED', total: 1 }))
      .mockResolvedValueOnce(json({ items: [], page: 0, size: 25, total: 0 }));
    await email.listAnnouncementRecipients('customer', 'FREE', { page: 0, size: 25 });
    expect(fetchMock.mock.calls[0][0]).toContain('/announcements/recipients?query=customer&tier=FREE');
    const payload = { campaignId: 'a1', recipientIds: ['u1'], subject: 'Notice', body: 'Body' };
    await email.sendAnnouncement(payload);
    expect(String(fetchMock.mock.calls[2][0])).toContain('/frontdesk/announcements');
    expect(String(fetchMock.mock.calls[2][0])).not.toContain('newsletter');
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string)).toEqual(payload);
    expect(fetchMock.mock.calls[2][1]!.headers).toMatchObject({ 'X-CSRF-TOKEN': 'csrf' });
    await email.getAnnouncement('a1');
    expect(String(fetchMock.mock.calls[3][0])).toContain('/frontdesk/announcements/a1');
    await email.listAnnouncements({ page: 0, size: 25 });
    expect(String(fetchMock.mock.calls[4][0])).toContain('/frontdesk/announcements?');
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

  it('signs in with email and password without CSRF and returns the challenge, never a session', async () => {
    const auth = new HttpAuthService(new ApiClient());
    fetchMock.mockResolvedValueOnce(json({ status: 'TOTP_REQUIRED', challenge: 'c1' }));
    await expect(auth.signIn('op@example.com', 'secret')).resolves.toEqual({ status: 'TOTP_REQUIRED', challenge: 'c1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/frontdesk/auth/login');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ email: 'op@example.com', password: 'secret' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/users/login'))).toBe(false);
  });

  it('rejects login responses which are not a known second-factor step', async () => {
    const auth = new HttpAuthService(new ApiClient());
    for (const bad of [{}, { status: 'AUTHENTICATED', challenge: 'c1' }, { status: 'TOTP_REQUIRED' }, { status: 'TOTP_REQUIRED', challenge: '' }]) {
      fetchMock.mockResolvedValueOnce(json(bad));
      await expect(auth.signIn('op@example.com', 'secret')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
    }
  });

  it('completes the second factor with a code or a recovery code and trusts only a valid operator body', async () => {
    const auth = new HttpAuthService(new ApiClient());
    fetchMock.mockResolvedValueOnce(json({ id: 'op-1', name: 'op@example.com', role: 'OPERATOR' }));
    await expect(auth.verifyTotp('c1', '123456')).resolves.toEqual({ id: 'op-1', name: 'op@example.com', role: 'OPERATOR' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/frontdesk/auth/totp');
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ challenge: 'c1', code: '123456' });
    fetchMock.mockResolvedValueOnce(json({ id: 'op-1', name: 'op@example.com', role: 'OPERATOR' }));
    await auth.verifyRecovery('c1', 'AAAA-BBBB-CCCC-DDDD');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/frontdesk/auth/recovery');
    fetchMock.mockResolvedValueOnce(json({ id: 'op-1', name: 'x', role: 'ADMIN' }));
    await expect(auth.verifyTotp('c1', '123456')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('enrols a second factor and returns the recovery codes only at confirmation', async () => {
    const auth = new HttpAuthService(new ApiClient());
    fetchMock.mockResolvedValueOnce(json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' }));
    await expect(auth.startEnrollment('c1')).resolves.toEqual({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/frontdesk/auth/enroll/start');
    fetchMock.mockResolvedValueOnce(json({ id: 'op-1', name: 'op@example.com', role: 'OPERATOR', recoveryCodes: ['AAAA-BBBB-CCCC-DDDD'] }));
    await expect(auth.confirmEnrollment('c1', '123456')).resolves.toEqual({
      operator: { id: 'op-1', name: 'op@example.com', role: 'OPERATOR' }, recoveryCodes: ['AAAA-BBBB-CCCC-DDDD'] });
    expect(fetchMock.mock.calls[1][0]).toBe('/api/frontdesk/auth/enroll/confirm');
    fetchMock.mockResolvedValueOnce(json({ id: 'op-1', name: 'op@example.com', role: 'OPERATOR' }));
    await expect(auth.confirmEnrollment('c1', '123456')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('does not report a wrong password or code as an expired session', async () => {
    const client = new ApiClient();
    const ended = vi.fn();
    client.onAccessFailure(ended);
    const auth = new HttpAuthService(client);
    fetchMock.mockImplementation(async () => json({}, 401));
    await expect(auth.signIn('op@example.com', 'wrong')).rejects.toMatchObject({ status: 401 });
    await expect(auth.verifyTotp('c1', '000000')).rejects.toMatchObject({ status: 401 });
    expect(ended).not.toHaveBeenCalled();
  });

  it('has no Google or legacy user login any more', () => {
    const auth = new HttpAuthService(new ApiClient()) as unknown as Record<string, unknown>;
    expect(auth.googleLoginUrl).toBeUndefined();
  });

  it('signs out of the operator session with a CSRF proof', async () => {
    const client = new ApiClient();
    const ended = vi.fn();
    client.onAccessFailure(ended);
    fetchMock.mockResolvedValueOnce(json(proof)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await new HttpAuthService(client).signOut();
    expect(fetchMock.mock.calls[1][0]).toBe('/api/frontdesk/auth/logout');
    expect((fetchMock.mock.calls[1][1]!.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe(proof.token);
    expect(ended).toHaveBeenCalledWith(401);
  });
  it('clears local session state if logout finds an already expired session', async () => {
    const client = new ApiClient();
    const ended = vi.fn();
    client.onAccessFailure(ended);
    fetchMock.mockResolvedValue(json({}, 401));
    await new HttpAuthService(client).signOut();
    expect(ended).toHaveBeenCalledWith(401);
  });

  it('normalizes unknown origins but never invents capabilities for old or inconsistent responses', async () => {
    const repo = new HttpTicketRepository(new ApiClient());
    const base = { id: 't1', userId: 'u1', userEmail: 'contact@example.com', messages: [] };
    fetchMock.mockResolvedValueOnce(json(base));
    expect(await repo.getById('t1')).toMatchObject({ origin: 'UNKNOWN', availableChannels: undefined });
    fetchMock.mockResolvedValueOnce(json({ ...base, origin: 'NEW_SOURCE', customerVisible: true,
      availableChannels: ['WEB', 'EMAIL'], webUnavailableReason: null }));
    expect(await repo.getById('t1')).toMatchObject({ origin: 'UNKNOWN', availableChannels: ['WEB', 'EMAIL'] });
    for (const fields of [
      { customerVisible: false, availableChannels: ['WEB'], webUnavailableReason: null },
      { customerVisible: true, availableChannels: ['FAX'], webUnavailableReason: null },
      { customerVisible: true, availableChannels: ['WEB', 'WEB'], webUnavailableReason: null },
      { customerVisible: true, availableChannels: [], webUnavailableReason: null },
      { customerVisible: true, availableChannels: { WEB: true }, webUnavailableReason: null },
      { customerVisible: true, availableChannels: ['EMAIL'], webUnavailableReason: 'NOT_CUSTOMER_VISIBLE' },
      { customerVisible: false, availableChannels: ['EMAIL'], webUnavailableReason: 'OWNER_INACTIVE' },
    ]) {
      fetchMock.mockResolvedValueOnce(json({ ...base, ...fields }));
      expect((await repo.getById('t1'))?.availableChannels).toBeUndefined();
    }
  });
});
