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
let ticket: Ticket;
let customer: User360;
let sentEmails: number;
let emailFailure: boolean;
let newsletterCampaign: NewsletterCampaign | null;

beforeEach(() => {
  localStorage.clear();
  authenticated = false;
  sentEmails = 0;
  emailFailure = false;
  newsletterCampaign = null;
  ticket = { id: 'real-ticket', userId: 'real-user', userName: 'Actual Customer', userEmail: 'customer@example.com',
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
    if (path === '/api/users/login') { authenticated = true; return json({ userId: 'real-op' }); }
    if (path === '/api/users/logout') { authenticated = false; return new Response(null, { status: 204 }); }
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
    return json({ message: `Unexpected fixture request: ${path}` }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

async function signIn() {
  fireEvent.change(await screen.findByLabelText('Username'), { target: { value: 'actual-user' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'temporary-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('button', { name: /^tickets/i });
}

describe('Live Frontdesk integration', () => {
  it('gates private queries, signs in, loads full ticket detail and writes a note with CSRF', async () => {
    render(<App />);
    await screen.findByLabelText('Username');
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
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/frontdesk/users?page=1'))).toBe(true));
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

  it('drops private UI when the session expires and never falls back to demo fixtures', async () => {
    authenticated = true;
    render(<App />);
    await screen.findByRole('button', { name: /^tickets/i });
    authenticated = false;
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /users 360/i })); });
    await screen.findByLabelText('Username');
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
    await screen.findByLabelText('Username');
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
