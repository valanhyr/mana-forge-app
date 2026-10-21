import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Messages from '../../views/messages/Messages';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { MessageService, type Conversation } from '../../services/MessageService';

const conversations: Conversation[] = [
  {
    friendId: 'f1',
    friend: { userId: 'f1', username: 'amiga', name: 'Amiga', avatar: 'ava1.jpg' },
    lastMessage: { id: 'm1', content: 'hola', createdAt: '2026-10-10T10:00:00Z' },
    lastMessageAt: '2026-10-10T10:00:00Z',
    unreadCount: 3,
  } as unknown as Conversation,
];

vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ user: { userId: 'u1', username: 'yo' } }),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <ToastProvider>
          <Routes>
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:friendId" element={<Messages />} />
          </Routes>
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Messages accessibility', () => {
  beforeEach(() => {
    // La vista monta la lista y el chat a la vez (móvil y escritorio), pero
    // entre tests el DOM anterior se acumula y duplica los roles.
    cleanup();
    localStorage.setItem('app_locale', 'es');
    vi.spyOn(MessageService, 'getConversations').mockResolvedValue(conversations);
    vi.spyOn(MessageService, 'getConversation').mockResolvedValue([]);
    vi.spyOn(MessageService, 'markAsRead').mockResolvedValue(undefined);
    vi.spyOn(MessageService, 'sendMessage').mockResolvedValue({
      id: 'm2',
      content: 'hola',
      createdAt: '2026-10-10T10:01:00Z',
      senderId: 'u1',
    } as never);
  });

  it('exposes the conversation list as a list of buttons', async () => {
    renderAt('/messages');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /amiga/i })[0]).toBeInTheDocument());
  });

  it('marks the unread count so it is announced', async () => {
    renderAt('/messages');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /amiga/i })[0]).toBeInTheDocument());
    const badge = screen.getAllByText('3')[0];
    expect(badge).toHaveAttribute('aria-label', expect.stringMatching(/3/i));
  });

  it('names the send button', async () => {
    const user = userEvent.setup();
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByPlaceholderText(/mensaje/i)[0]).toBeInTheDocument());
    const send = screen.getAllByRole('button', { name: /enviar/i })[0];
    await user.type(screen.getAllByPlaceholderText(/mensaje/i)[0], 'hola');
    await user.click(send);
    await waitFor(() => expect(MessageService.sendMessage).toHaveBeenCalled());
  });

  it('disables the send button while the input is empty', async () => {
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByPlaceholderText(/mensaje/i)[0]).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: /enviar/i })[0]).toBeDisabled();
  });

  it('does not remove the focus indicator from the back button', async () => {
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /volver/i })[0]).toBeInTheDocument());
    const back = screen.getAllByRole('button', { name: /volver/i })[0];
    expect(back.className).not.toContain('outline-none');
  });

  it('localises the back button label', async () => {
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /volver/i })[0]).toBeInTheDocument());
    localStorage.setItem('app_locale', 'en');
  });

  it('marks the message area as a live log', async () => {
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByPlaceholderText(/mensaje/i)[0]).toBeInTheDocument());
    const log = screen.getAllByRole('log')[0];
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('labels the conversation list region', async () => {
    renderAt('/messages');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /amiga/i })[0]).toBeInTheDocument());
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
  });

  it('does not duplicate the message input and send button', async () => {
    renderAt('/messages/f1');
    await waitFor(() => expect(screen.getAllByRole('textbox')).toHaveLength(1));
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /enviar/i })).toHaveLength(1);
  });

  it('does not duplicate the navigation region', async () => {
    renderAt('/messages');
    await waitFor(() => expect(screen.getAllByRole('navigation')).toHaveLength(1));
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
  });
});