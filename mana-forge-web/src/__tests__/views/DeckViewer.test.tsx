import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeckViewer from '../../views/deck-viewer/DeckViewer';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { UserProvider } from '../../services/UserContext';
import { DeckService } from '../../services/DeckService';
import { ScryfallService } from '../../services/ScryfallService';

// Mock IntersectionObserver used by DeckViewer's sentinel ref
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(function () {
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    this.unobserve = vi.fn();
  }),
});

vi.mock('../../services/DeckService', () => ({
  DeckService: {
    getDeckView: vi.fn(),
    likeDeck: vi.fn(),
    unlikeDeck: vi.fn(),
    cloneDeck: vi.fn(),
  },
}));

vi.mock('../../services/ScryfallService', () => ({
  ScryfallService: {
    getCardByName: vi.fn(),
  },
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <UserProvider>
      <ToastProvider>{children}</ToastProvider>
    </UserProvider>
  </LanguageProvider>
);

const deckData = {
  id: 'deck-1',
  name: 'Mazo Goblins',
  formatName: 'Premodern',
  ownerUsername: 'valan',
  colors: ['R'],
  mainDeck: [
    {
      scryfallId: 'c1',
      name: 'Goblin Guide',
      manaCost: '{R}',
      cmc: 1,
      typeLine: 'Creature — Goblin Warrior',
      imageUris: { normal: 'https://example.com/guide.jpg' },
      quantity: 4,
    },
    {
      scryfallId: 'c2',
      name: 'Lightning Bolt',
      manaCost: '{R}',
      cmc: 1,
      typeLine: 'Instant',
      imageUris: { normal: 'https://example.com/bolt.jpg' },
      quantity: 4,
    },
  ],
  sideboard: [
    {
      scryfallId: 'c3',
      name: 'Goblin Piledriver',
      manaCost: '{1}{R}',
      cmc: 2,
      typeLine: 'Creature — Goblin Warrior',
      imageUris: { normal: 'https://example.com/piledriver.jpg' },
      quantity: 2,
    },
  ],
  likesCount: 10,
  likedByMe: false,
};

const renderDeck = (deckId = 'deck-1') =>
  render(
    <AllProviders>
      <MemoryRouter initialEntries={[`/decks/${deckId}`]}>
        <Routes>
          <Route path="/decks/:deckId" element={<DeckViewer />} />
        </Routes>
      </MemoryRouter>
    </AllProviders>
  );

describe('DeckViewer', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(DeckService.getDeckView).mockResolvedValue(deckData);
    vi.mocked(DeckService.likeDeck).mockResolvedValue({
      likesCount: 11,
      likedByMe: true,
    });
    vi.mocked(DeckService.unlikeDeck).mockResolvedValue({
      likesCount: 10,
      likedByMe: false,
    });
    vi.mocked(DeckService.cloneDeck).mockResolvedValue({ id: 'deck-cloned' });
    vi.mocked(ScryfallService.getCardByName).mockResolvedValue({
      image_uris: { normal: 'https://example.com/card.jpg' },
    } as never);
  });

  it('shows a loader while fetching the deck', () => {
    const { container } = renderDeck();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders the deck title, format and owner once loaded', async () => {
    renderDeck();
    await waitFor(() => expect(screen.getByText('Mazo Goblins')).toBeInTheDocument());
    expect(screen.getByText(/Premodern/i)).toBeInTheDocument();
    expect(screen.getByText(/valan/i)).toBeInTheDocument();
  });

  it('renders main deck cards', async () => {
    renderDeck();
    await waitFor(() => expect(screen.getAllByText('Goblin Guide').length).toBeGreaterThan(0));
    expect(screen.getByText('Lightning Bolt')).toBeInTheDocument();
  });

  it('renders sideboard cards', async () => {
    renderDeck();
    await waitFor(() => expect(screen.getByText('Goblin Piledriver')).toBeInTheDocument());
  });

  it('shows like button and toggles it', async () => {
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText('Mazo Goblins')).toBeInTheDocument());
    const likeButton = screen.getByRole('button', { name: /me gusta/i });
    await user.click(likeButton);
    await waitFor(() => expect(vi.mocked(DeckService.likeDeck)).toHaveBeenCalledWith('deck-1'));
  });

  it('shows clone button and calls clone', async () => {
    const user = userEvent.setup();
    renderDeck();
    await waitFor(() => expect(screen.getByText('Mazo Goblins')).toBeInTheDocument());
    const cloneButton = screen.getByRole('button', { name: /duplicar/i });
    await user.click(cloneButton);
    await waitFor(() => expect(vi.mocked(DeckService.cloneDeck)).toHaveBeenCalledWith('deck-1'));
  });

  it('shows copy button', async () => {
    renderDeck();
    await waitFor(() => expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument());
  });

  it('renders not-found state when deck is null', async () => {
    vi.mocked(DeckService.getDeckView).mockResolvedValue(null);
    renderDeck('no-existe');
    await waitFor(() => expect(screen.getByText(/mazo no encontrado/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /volver/i })).toBeInTheDocument();
  });

  it('renders card images with alt text', async () => {
    renderDeck();
    await waitFor(() => expect(screen.getByAltText('Goblin Guide')).toBeInTheDocument());
  });
});