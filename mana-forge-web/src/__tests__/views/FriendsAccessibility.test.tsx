import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Friends from '../../views/friends/Friends';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { FriendService } from '../../services/FriendService';

vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ user: { userId: 'u1', username: 'yo' }, isAuthenticated: true }),
}));

const renderFriends = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <Friends />
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Friends accessibility', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem('app_locale', 'es');
    vi.restoreAllMocks();
    vi.spyOn(FriendService, 'getFriends').mockResolvedValue([] as never);
    vi.spyOn(FriendService, 'getReceivedRequests').mockResolvedValue([] as never);
    vi.spyOn(FriendService, 'getSentRequests').mockResolvedValue([] as never);
    vi.spyOn(FriendService, 'searchUsers').mockResolvedValue([] as never);
  });

  it('labels the search field', async () => {
    const { container } = renderFriends();
    await waitFor(() => expect(container.querySelector('input[type="text"]')).toBeTruthy());
    expect(screen.getByLabelText(/buscar/i)).toBe(container.querySelector('input[type="text"]'));
  });

  it('exposes the section switcher as a tablist', async () => {
    renderFriends();
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('marks only the active tab as selected', async () => {
    renderFriends();
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    const [first, second] = screen.getAllByRole('tab');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-selected', 'false');
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    renderFriends();
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    const [, second] = screen.getAllByRole('tab');
    await user.click(second);
    await waitFor(() => expect(second).toHaveAttribute('aria-selected', 'true'));
  });

  it('moves between tabs with arrow keys', async () => {
    const user = userEvent.setup();
    renderFriends();
    await waitFor(() => expect(screen.getByRole('tablist')).toBeInTheDocument());
    const [first, second] = screen.getAllByRole('tab');
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(first).toHaveFocus();
  });
});