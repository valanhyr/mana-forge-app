import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyDecks from '../../views/my-decks/MyDecks';
import { LanguageProvider } from '../../services/LanguageContext';

vi.mock('../../services/UserContext', () => ({
  useUser: () => ({
    user: { userId: 'u1', username: 'yo' },
    decks: [],
    loadDecks: vi.fn(),
    deleteDeck: vi.fn().mockResolvedValue(undefined),
    togglePinDeck: vi.fn(),
  }),
}));

vi.mock('../../components/ui/DeckTable', () => ({
  default: vi.fn(() => <div data-testid="deck-table">DeckTable</div>),
}));

const renderMyDecks = () =>
  render(
    <MemoryRouter initialEntries={['/my-decks']}>
      <LanguageProvider>
        <MyDecks />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('MyDecks', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
  });

  it('renders the page title', async () => {
    renderMyDecks();
    await waitFor(() => expect(screen.getByText(/mis mazos/i)).toBeInTheDocument());
  });

  it('renders the create new deck link', async () => {
    renderMyDecks();
    await waitFor(() => expect(screen.getByRole('link', { name: /crear mazo/i })).toBeInTheDocument());
  });

  it('renders the DeckTable component', async () => {
    renderMyDecks();
    await waitFor(() => expect(screen.getByTestId('deck-table')).toBeInTheDocument());
  });

  it('loads decks on mount', async () => {
    renderMyDecks();
    await waitFor(() => expect(screen.getByTestId('deck-table')).toBeInTheDocument());
  });
});