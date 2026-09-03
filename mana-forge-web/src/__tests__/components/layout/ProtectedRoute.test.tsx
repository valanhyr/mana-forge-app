import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../../components/layout/ProtectedRoute';
import * as UserContextModule from '../../../services/UserContext';

// Mock UserContext
vi.mock('../../../services/UserContext', () => ({
  useUser: vi.fn(),
}));

// Mock ForgeSpinner
vi.mock('../../../components/ui/ForgeSpinner', () => ({
  default: () => <div data-testid="forge-spinner">Loading...</div>,
}));

const mockUseUser = UserContextModule.useUser as ReturnType<typeof vi.fn>;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra ForgeSpinner cuando isSessionLoading es true', () => {
    mockUseUser.mockReturnValue({
      isAuthenticated: false,
      isSessionLoading: true,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      decks: [],
      loadDecks: vi.fn(),
      addDeck: vi.fn(),
      updateDeck: vi.fn(),
      deleteDeck: vi.fn(),
      togglePinDeck: vi.fn(),
      loadDecksError: null,
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByTestId('forge-spinner')).toBeInTheDocument();
  });

  it('redirige a / cuando no está autenticado', () => {
    mockUseUser.mockReturnValue({
      isAuthenticated: false,
      isSessionLoading: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      decks: [],
      loadDecks: vi.fn(),
      addDeck: vi.fn(),
      updateDeck: vi.fn(),
      deleteDeck: vi.fn(),
      togglePinDeck: vi.fn(),
      loadDecksError: null,
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    // When not authenticated, it should not show protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('muestra Outlet cuando está autenticado', () => {
    mockUseUser.mockReturnValue({
      isAuthenticated: true,
      isSessionLoading: false,
      user: { id: 'user1', email: 'test@example.com' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      decks: [],
      loadDecks: vi.fn(),
      addDeck: vi.fn(),
      updateDeck: vi.fn(),
      deleteDeck: vi.fn(),
      togglePinDeck: vi.fn(),
      loadDecksError: null,
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
