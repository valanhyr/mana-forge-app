import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Inbox from '../../views/messages/Inbox';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';

vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ user: { userId: 'u1', username: 'yo' }, isAuthenticated: true }),
}));

vi.mock('../../services/MessageService', () => ({
  MessageService: {
    getConversations: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue([]),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue({}),
  },
}));

const renderInbox = (path = '/messages') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <ToastProvider>
          <Routes>
            <Route path="/messages" element={<Inbox />} />
            <Route path="/messages/:friendId" element={<Inbox />} />
          </Routes>
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Inbox', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
  });

  it('renders the navigation with friends and support links', async () => {
    renderInbox();
    await waitFor(() => expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0));
    const navs = screen.getAllByRole('navigation');
    expect(navs.some((n) => n.getAttribute('aria-label'))).toBe(true);
    expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(2);
  });

  it('labels the inbox navigation accessibly', async () => {
    renderInbox();
    await waitFor(() => expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0));
    const navs = screen.getAllByRole('navigation');
    expect(navs.some((n) => n.getAttribute('aria-label'))).toBe(true);
  });

  it('shows the messages input when viewing a conversation', async () => {
    renderInbox('/messages/f1');
    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0));
  });
});