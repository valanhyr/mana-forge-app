import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Ticket } from './core/domain/ticket';
import { User360 } from './core/domain/user';
import { NewsletterCampaign } from './core/domain/email';

vi.mock('./infrastructure/container', async () => {
  const actual = await vi.importActual<typeof import('./infrastructure/container')>('./infrastructure/container');
  return { ...actual, container: new actual.ServiceContainer({ useMocks: false }) };
});

import App from './App';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const fetchMock = vi.fn<typeof fetch>();
let authenticated: boolean;
let enrolled: boolean;
const operatorBody = { id: 'real-op', name: 'Actual Operator', role: 'OPERATOR' };
let ticket: Ticket;
let customer: User360;
let sentEmails: number;
let emailFailure: boolean;
let newsletterCampaign: NewsletterCampaign | null;
let announcementCampaign: NewsletterCampaign | null;

beforeEach(() => {
  localStorage.clear();
  authenticated = false;
  enrolled = true;
  sentEmails = 0;
  emailFailure = false;
  newsletterCampaign = null;
  announcementCampaign = null;
  ticket = { id: 'real-ticket', userId: 'real-user', userName: 'Actual Customer', userEmail: 'customer@example.com',
    origin: 'SUPPORT_WEB', customerVisible: true, availableChannels: ['WEB', 'EMAIL'], webUnavailableReason: null,
    subject: 'Actual backend support ticket', category: 'ACCOUNT', priority: 'HIGH', status: 'OPEN',
    createdAt: '2026-10-08T10:00:00Z', updatedAt: '2026-10-08T10:00:00Z',
    messages: [{ id: 'real-message', sender: 'USER', senderName: 'Actual Customer', content: 'Actual conversation from Mongo', createdAt: '2026-10-08T10:00:00Z' }] };
  customer = { id: 'real-user', username: 'Actual Customer', email: 'customer@example.com', tier: 'FREE', status: 'ACTIVE',
    createdAt: null, lastLoginAt: null, recentDecks: [], openTicketsCount: 1,
    stats: { totalDecks: 0, aiQuotaPeriod: 'DAILY', aiQueriesToday: 3, aiQuotaLimit: 25, aiQueriesThisMonth: null, failedImportsCount: null } };
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://frontdesk.test');
    const path = url.pathname;
    const body = init?.body ? JSON.parse(init.body as string) : {};
    if (path === '/api/frontdesk/auth/login') {
      return body.password === 'right-password' ? json({ status: enrolled ? 'TOTP_REQUIRED' : 'ENROLLMENT_REQUIRED', challenge: 'challenge-1' }) : json({}, 401);
    }
    if (path === '/api/frontdesk/auth/totp') {
      if (body.challenge === 'challenge-1' && body.code === '123456') { authenticated = true; return json(operatorBody); }
      return json({}, 401);
    }
    if (path === '/api/frontdesk/auth/recovery') {
      if (body.challenge === 'challenge-1' && body.code === 'AAAA-BBBB-CCCC-DDDD') { authenticated = true; return json(operatorBody); }
      return json({}, 401);
    }
    if (path === '/api/frontdesk/auth/enroll/start') return json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/Frontdesk:op?secret=JBSWY3DPEHPK3PXP' });
    if (path === '/api/frontdesk/auth/enroll/confirm') {
      if (body.code !== '123456') return json({}, 401);
      authenticated = true;
      return json({ ...operatorBody, recoveryCodes: ['AAAA-BBBB-CCCC-DDDD', 'EEEE-FFFF-GGGG-HHHH'] });
    }
    if (path === '/api/frontdesk/auth/logout') { authenticated = false; return new Response(null, { status: 204 }); }
    if (!authenticated) return json({ error: 'Unauthorized' }, 401);
    if (path === '/api/frontdesk/me') return json({ id: 'real-op', name: 'Actual Operator', role: 'OPERATOR' });
    if (path === '/api/frontdesk/csrf') return json({ headerName: 'X-CSRF-TOKEN', token: 'actual-csrf' });
    if (path === '/api/frontdesk/tickets') {
      const match = (!url.searchParams.get('status') || url.searchParams.get('status') === ticket.status)
        && (!url.searchParams.get('priority') || url.searchParams.get('priority') === ticket.priority);
      return json({ items: match ? [{ ...ticket, messages: [] }] : [], total: match ? 1 : 0,
        page: Number(url.searchParams.get('page')), size: Number(url.searchParams.get('size')) });
    }
    if (path === '/api/frontdesk/tickets/real-ticket') return json(ticket);
    if (path.endsWith('/real-ticket/messages')) {
      ticket = { ...ticket, messages: [...ticket.messages, { id: 'new-message', sender: 'OPERATOR', senderName: 'Actual Operator', content: body.content,
        isInternalNote: body.isInternalNote, createdAt: '2026-10-08T11:00:00Z' }] };
      return json(ticket);
    }
    if (path.endsWith('/real-ticket/status')) { ticket.status = body.status; return json(ticket); }
    if (path.endsWith('/real-ticket/assignee')) { ticket.assignedOperatorId = body.operatorId; ticket.assignedOperatorName = 'Actual Operator'; return json(ticket); }
    if (path === '/api/frontdesk/users') return json({ items: [customer], total: 30,
      page: Number(url.searchParams.get('page')), size: Number(url.searchParams.get('size')) });
    if (path === '/api/frontdesk/users/real-user') return json(customer);
    if (path.endsWith('/real-user/ai-quota/reset')) { customer.stats.aiQueriesToday = 0; return json(customer); }
    if (path.endsWith('/real-user/status')) { customer.status = body.status; return json(customer); }
    if (path === '/api/frontdesk/audit') return json({ items: [], page: 0, size: Number(url.searchParams.get('size')), total: 0 });
    if (path === '/api/frontdesk/email-templates') return json([{ id: 'directus-template', title: 'Actual Directus template', category: 'support',
      subject: 'Support update', bodyTemplate: 'Hello {{user.name}}', availableMacros: ['user.name'] }]);
    if (path === '/api/frontdesk/emails' && init?.method === 'POST') {
      sentEmails++;
      return emailFailure ? json({ message: 'Email could not be sent' }, 502) : json({ success: true, messageId: 'actual-message-id', deliveryId: 'actual-delivery' });
    }
    if (path === '/api/frontdesk/emails') return json({ items: [], page: 0, size: 25, total: 0 });
    if (path === '/api/frontdesk/newsletter/subscribers') return json({ items: [{ id: 'subscriber-1', username: 'Consenting customer', email: 'subscriber@example.com', tier: 'FREE' }], page: 0, size: Number(url.searchParams.get('size')), total: 1 });
    if (path === '/api/frontdesk/newsletter/campaigns' && init?.method === 'POST') {
      newsletterCampaign = { id: body.campaignId, state: 'COMPLETED', total: body.recipientIds.length, sent: body.recipientIds.length, failed: 0, skipped: 0 };
      return json(newsletterCampaign, 202);
    }
    if (path === '/api/frontdesk/newsletter/campaigns') return json({ items: newsletterCampaign ? [newsletterCampaign] : [], page: 0, size: 25, total: newsletterCampaign ? 1 : 0 });
    if (path.startsWith('/api/frontdesk/newsletter/campaigns/')) return newsletterCampaign ? json(newsletterCampaign) : json({}, 404);
    if (path === '/api/frontdesk/announcements/recipients') return json({ items: [{ id: 'user-1', username: 'Unsubscribed customer', email: 'customer@example.com', tier: 'FREE' }], page: 0, size: Number(url.searchParams.get('size')), total: 1 });
    if (path === '/api/frontdesk/announcements' && init?.method === 'POST') {
      announcementCampaign = { id: body.campaignId, state: 'COMPLETED', total: body.recipientIds.length, sent: body.recipientIds.length, failed: 0, skipped: 0 };
      return json(announcementCampaign, 202);
    }
    if (path === '/api/frontdesk/announcements') return json({ items: announcementCampaign ? [announcementCampaign] : [], page: 0, size: 25, total: announcementCampaign ? 1 : 0 });
    if (path.startsWith('/api/frontdesk/announcements/')) return announcementCampaign ? json(announcementCampaign) : json({}, 404);
    return json({ message: `Unexpected fixture request: ${path}` }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

async function passwordStep(password = 'right-password') {
  fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'op@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

async function signIn() {
  await passwordStep();
  fireEvent.change(await screen.findByLabelText('Authentication code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  await screen.findByRole('button', { name: /^tickets/i });
}

describe('Live Frontdesk integration', () => {
  it('preserves a public draft on a channel conflict and never retries the mutation', async () => {
    authenticated = true;
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/real-ticket/messages')
      ? json({ code: 'WEB_CHANNEL_UNAVAILABLE', error: 'No web access' }, 409) : normal(input, init));
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    const draft = await screen.findByRole('textbox', { name: 'Web reply' });
    fireEvent.change(draft, { target: { value: 'Keep my answer' } });
    fireEvent.click(screen.getByRole('button', { name: /respond on the web/i }));
    await screen.findByText(/web channel is no longer available/i);
    expect(draft).toHaveValue('Keep my answer');
    expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/real-ticket/messages'))).toHaveLength(1);
    expect(sentEmails).toBe(0);
  });
  it('asks before closing a contextual draft and cancellation sends nothing', async () => {
    authenticated = true;
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    fireEvent.click(await screen.findByRole('button', { name: /respond by email/i }));
    await screen.findByLabelText(/body content/i);
    fireEvent.change(screen.getByLabelText(/body content/i), { target: { value: 'Unsent draft' } });
    fireEvent.click(screen.getByRole('button', { name: /close email composer/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /close email composer/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(sentEmails).toBe(0);
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/real-ticket/messages'))).toBe(false);
    confirm.mockRestore();
  });
  it('does not reuse a private draft when selecting a different ticket', async () => {
    authenticated = true;
    const other: Ticket = { ...ticket, id: 'other-ticket', subject: 'Other person query', userName: 'Other person', userEmail: 'other@example.com' };
    const normal = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (input, init) => {
      const path = new URL(String(input), 'http://frontdesk.test').pathname;
      if (path === '/api/frontdesk/tickets') return json({ items: [{ ...ticket, messages: [] }, { ...other, messages: [] }], page: 0, size: 25, total: 2 });
      if (path === '/api/frontdesk/tickets/other-ticket') return json(other);
      return normal(input, init);
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    await screen.findByRole('textbox', { name: 'Web reply' });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByRole('textbox', { name: /internal note/i }), { target: { value: 'SECRET for A only' } });
    fireEvent.click(screen.getByText('Other person query'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Web reply' })).toHaveValue(''));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByDisplayValue('SECRET for A only')).not.toBeInTheDocument();
    expect(sentEmails).toBe(0);
    confirm.mockRestore();
  });
  it('saves a visible web reply without email and reports persistence rather than delivery', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    const draft = await screen.findByRole('textbox', { name: 'Web reply' });
    fireEvent.change(draft, { target: { value: 'Public answer' } });
    fireEvent.click(screen.getByRole('button', { name: /respond on the web/i }));
    await screen.findByText('Public answer');
    await screen.findByText(/Reply saved in the web conversation/);
    expect(sentEmails).toBe(0);
    expect(draft).toHaveValue('');
  });
  it('clears an open contextual composer when the session expires', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    fireEvent.click(await screen.findByRole('button', { name: /respond by email/i }));
    await screen.findByLabelText(/recipient email/i);
    authenticated = false;
    fireEvent.click(screen.getByRole('button', { name: /dispatch email/i }));
    await screen.findByLabelText('Email');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('customer@example.com')).not.toBeInTheDocument();
  });
  it('prepares contact email without saving an unreachable reply or copying notes', async () => {
    authenticated = true;
    ticket = { ...ticket, origin: 'CONTACT_FORM', customerVisible: false, availableChannels: ['EMAIL'],
      webUnavailableReason: 'NOT_CUSTOMER_VISIBLE', messages: [...ticket.messages, { id: 'private-note', sender: 'OPERATOR',
        senderName: 'Operator', content: 'SECRET investigation', isInternalNote: true, createdAt: ticket.createdAt }] };
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /^tickets/i }));
    await screen.findByText(/cannot read this conversation/i);
    expect(screen.queryByRole('button', { name: /respond on the web/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /respond by email/i }));
    await screen.findByRole('dialog', { name: /prepare an email/i });
    await screen.findByLabelText(/recipient email/i);
    expect(sentEmails).toBe(0);
    expect(screen.getByLabelText(/body content/i)).not.toHaveValue(expect.stringContaining('SECRET'));
    expect(screen.getByLabelText(/recipient email/i)).toHaveValue('customer@example.com');
    fireEvent.click(screen.getByRole('button', { name: /dispatch email/i }));
    await screen.findByText(/Email accepted by SMTP/);
    const email = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/frontdesk/emails') && init?.method === 'POST')!;
    expect(JSON.parse(email[1]!.body as string)).toMatchObject({ ticketId: 'real-ticket', to: 'customer@example.com' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/real-ticket/messages'))).toBe(false);
  });
  it('gates private queries, signs in, loads full ticket detail and writes a note with CSRF', async () => {
    render(<App />);
    await screen.findByLabelText('Email');
    expect(fetchMock.mock.calls).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/frontdesk/me');
    await signIn();
    expect(screen.queryByText(/MOCK MODE/)).not.toBeInTheDocument();
    expect(screen.getByText('LIVE API')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset Seeds' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^tickets/i }));
    await screen.findByText('Actual conversation from Mongo');
    fireEvent.click(screen.getByLabelText(/internal note/i));
    fireEvent.change(screen.getByPlaceholderText(/write an internal investigation/i), { target: { value: 'Private real note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Note' }));
    await screen.findByText('Private real note');
    const write = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/real-ticket/messages'))!;
    expect(write[1]).toMatchObject({ credentials: 'include', headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'actual-csrf' }) });
    expect(JSON.parse(write[1]!.body as string)).toEqual({ content: 'Private real note', isInternalNote: true });
    expect(localStorage.length).toBe(0);
  });

  it('loads paged users, shows daily quota and handles missing dates without epoch fabrication', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /users 360/i }));
    await screen.findByText('Daily AI Quota');
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/1970/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reset quota/i }));
    await waitFor(() => expect(customer.stats.aiQueriesToday).toBe(0));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => {
      const parsed = new URL(String(url), 'https://frontdesk.test');
      return parsed.pathname.endsWith('/frontdesk/users') && parsed.searchParams.get('page') === '1';
    })).toBe(true));
  });

  it('uses Directus templates, disables broadcasts and does not retry a failed SMTP send', async () => {
    authenticated = true;
    emailFailure = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /email outreach/i }));
    await screen.findByText('Actual Directus template');
    expect(screen.getByRole('button', { name: /audience broadcast/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'customer@example.com' } });
    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Actual Customer' } });
    fireEvent.click(screen.getByRole('button', { name: /dispatch email/i }));
    await screen.findByText('Email could not be sent');
    expect(sentEmails).toBe(1);
    expect(screen.queryByText(/Email accepted by SMTP/)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello Actual Customer')).toBeInTheDocument();
  });

  it('selects consenting subscribers, confirms a newsletter and submits only their IDs with CSRF', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /email outreach/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Newsletter' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Consenting customer/ }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Mana Forge news' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'New deck tools' } });
    fireEvent.click(screen.getByRole('button', { name: /Review recipients/ }));
    expect(newsletterCampaign).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start campaign' }));
    await waitFor(() => expect(newsletterCampaign).not.toBeNull());
    const write = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/newsletter/campaigns') && init?.method === 'POST')!;
    expect(write[1]!.headers).toMatchObject({ 'X-CSRF-TOKEN': 'actual-csrf' });
    expect(JSON.parse(write[1]!.body as string)).toMatchObject({ recipientIds: ['subscriber-1'], subject: 'Mana Forge news', body: 'New deck tools' });
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(sentEmails).toBe(0);
  });

  it('sends a service announcement to selected users without newsletter consent, never via newsletter endpoints', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /email outreach/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Service announcement' }));
    expect(screen.getByText(/not a newsletter/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('checkbox', { name: /Unsubscribed customer/ }));
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Maintenance' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Tonight at 22:00' } });
    fireEvent.click(screen.getByRole('button', { name: /Review recipients/ }));
    expect(announcementCampaign).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Send announcement' }));
    await waitFor(() => expect(announcementCampaign).not.toBeNull());
    const write = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith('/frontdesk/announcements') && init?.method === 'POST')!;
    expect(write[1]!.headers).toMatchObject({ 'X-CSRF-TOKEN': 'actual-csrf' });
    expect(JSON.parse(write[1]!.body as string)).toMatchObject({ recipientIds: ['user-1'], subject: 'Maintenance', body: 'Tonight at 22:00' });
    expect(screen.getByLabelText('Subject')).toBeDisabled();
    expect(newsletterCampaign).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/newsletter/'))).toBe(false);
    expect(sentEmails).toBe(0);
  });

  it('drops private UI when the session expires and never falls back to demo fixtures', async () => {
    authenticated = true;
    render(<App />);
    await screen.findByRole('button', { name: /^tickets/i });
    authenticated = false;
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /users 360/i })); });
    await screen.findByLabelText('Email');
    expect(screen.queryByText('Actual Customer')).not.toBeInTheDocument();
    expect(screen.queryByText(/Jace Beleren/)).not.toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('does not fetch backoffice data for a forbidden or unavailable session', async () => {
    fetchMock.mockImplementation(async () => json({ error: 'Forbidden' }, 403));
    render(<App />);
    await screen.findByText(/Operator access required/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /^tickets/i })).not.toBeInTheDocument();
  });

  it('clears private UI on successful logout without relying on a page reload', async () => {
    authenticated = true;
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await screen.findByLabelText('Email');
    expect(screen.queryByText('Actual Operator')).not.toBeInTheDocument();
    expect(authenticated).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it('reports unavailable API instead of displaying seeded data', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    render(<App />);
    await screen.findByText(/The API is unavailable/);
    expect(screen.queryByText(/Jace Beleren/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });

  it('revalidates revoked access when returning to the browser tab', async () => {
    authenticated = true;
    render(<App />);
    await screen.findByRole('button', { name: /^tickets/i });
    fetchMock.mockImplementation(async () => json({ error: 'Forbidden' }, 403));
    fireEvent(window, new Event('focus'));
    await screen.findByText(/Operator access required/);
    expect(screen.queryByRole('button', { name: /^tickets/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Actual Operator')).not.toBeInTheDocument();
  });
});

describe('Operator sign-in', () => {
  it('asks for the second factor after the password and only then opens the app', async () => {
    render(<App />);
    await passwordStep();
    expect(await screen.findByLabelText('Authentication code')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tickets/i })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/users/login'))).toBe(false);
    fireEvent.change(screen.getByLabelText('Authentication code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await screen.findByRole('button', { name: /^tickets/i });
  });

  it('shows one generic failure for a wrong password or a wrong code and never says the session expired', async () => {
    render(<App />);
    await passwordStep('wrong-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');
    expect(screen.queryByText(/Your session ended/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('');

    await passwordStep();
    fireEvent.change(await screen.findByLabelText('Authentication code'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');
    expect(screen.queryByText(/Your session ended/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Authentication code')).toHaveValue('');
    expect(screen.queryByRole('button', { name: /^tickets/i })).not.toBeInTheDocument();
  });

  it('accepts a recovery code instead of the authenticator code', async () => {
    render(<App />);
    await passwordStep();
    fireEvent.click(await screen.findByRole('button', { name: 'Use a recovery code' }));
    fireEvent.change(await screen.findByLabelText('Recovery code'), { target: { value: 'AAAA-BBBB-CCCC-DDDD' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
    await screen.findByRole('button', { name: /^tickets/i });
  });

  it('can go back from the second factor without keeping the challenge', async () => {
    render(<App />);
    await passwordStep();
    await screen.findByLabelText('Authentication code');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.queryByLabelText('Authentication code')).not.toBeInTheDocument();
  });

  it('enrols the authenticator and holds the app back until the recovery codes are acknowledged', async () => {
    enrolled = false;
    render(<App />);
    await passwordStep();
    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Authentication code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and continue' }));

    expect(await screen.findByText('AAAA-BBBB-CCCC-DDDD')).toBeInTheDocument();
    expect(screen.getByText('EEEE-FFFF-GGGG-HHHH')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^tickets/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I have saved them' }));
    await screen.findByRole('button', { name: /^tickets/i });
    expect(screen.queryByText('AAAA-BBBB-CCCC-DDDD')).not.toBeInTheDocument();
  });

  it('keeps recovery codes and secrets out of browser storage', async () => {
    enrolled = false;
    render(<App />);
    await passwordStep();
    fireEvent.change(await screen.findByLabelText('Authentication code'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and continue' }));
    await screen.findByText('AAAA-BBBB-CCCC-DDDD');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('offers neither Google nor a username login', async () => {
    render(<App />);
    await screen.findByLabelText('Email');
    expect(screen.queryByText(/Google/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
  });

  it('signs out through the operator endpoint and returns to the password step', async () => {
    authenticated = true;
    render(<App />);
    await screen.findByRole('button', { name: /^tickets/i });
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/frontdesk/auth/logout')).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/users/logout'))).toBe(false);
  });
});
