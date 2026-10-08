import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Support from '../../views/messages/Support';
import { LanguageProvider } from '../../services/LanguageContext';
import { SupportService, type SupportTicket } from '../../services/SupportService';

const ticket: SupportTicket = { id: 't1', subject: 'Help with my deck', category: 'DECK_BUILDER', status: 'WAITING_USER', createdAt: '2026-10-08T00:00:00Z', updatedAt: '2026-10-08T00:00:00Z', messages: [{ id: 'm1', sender: 'OPERATOR', content: 'Public reply from support', createdAt: '2026-10-08T00:00:00Z' }] };
const open = (path = '/messages/support/t1') => render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/messages/support" element={<Support />} /><Route path="/messages/support/:ticketId" element={<Support />} />
</Routes></MemoryRouter></LanguageProvider>);

describe('Customer support inbox', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.spyOn(SupportService, 'list').mockResolvedValue({ items: [ticket], page: 0, size: 25, total: 1 });
    vi.spyOn(SupportService, 'get').mockResolvedValue(ticket);
  });
  it('continues an existing conversation without resending the subject or identity', async () => {
    const reply = vi.spyOn(SupportService, 'reply').mockResolvedValue({ ...ticket, status: 'OPEN' });
    const user = userEvent.setup(); open();
    expect(await screen.findByText('Public reply from support')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Thank you');
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    await waitFor(() => expect(reply).toHaveBeenCalledWith('t1', 'Thank you'));
  });
  it('closed requests do not offer a reply form', async () => {
    vi.spyOn(SupportService, 'get').mockResolvedValue({ ...ticket, status: 'CLOSED' });
    open(); await screen.findByText('Public reply from support');
    expect(screen.queryByRole('textbox', { name: 'Mensaje' })).not.toBeInTheDocument();
    expect(screen.getByText('Nueva consulta')).toBeInTheDocument();
  });
  it('does not replace a failed private request with demo data', async () => {
    vi.spyOn(SupportService, 'get').mockRejectedValue(new Error('Forbidden'));
    open(); expect(await screen.findByRole('alert')).toHaveTextContent('No se pueden cargar');
    expect(screen.queryByText('Public reply from support')).not.toBeInTheDocument();
  });
});
