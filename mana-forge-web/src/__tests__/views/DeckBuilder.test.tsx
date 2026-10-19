import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckBuilder from '../../views/deck-builder/DeckBuilder';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { UserProvider } from '../../services/UserContext';
import { FormatService } from '../../services/FormatService';
import { CardService } from '../../services/CardService';
import { DeckService } from '../../services/DeckService';

vi.mock('../../services/UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: () => ({
    user: { userId: 'u1', username: 'testuser' },
    decks: [],
    loadDecks: vi.fn(),
    deleteDeck: vi.fn(),
    togglePinDeck: vi.fn(),
  }),
}));

vi.mock('../../services/FormatService', () => ({
  FormatService: {
    getActiveFormats: vi.fn(),
  },
}));

vi.mock('../../services/CardService', () => ({
  CardService: {
    getCardByName: vi.fn(),
    batchSearch: vi.fn(),
    autocomplete: vi.fn(),
    getBannedcards: vi.fn(),
  },
}));

vi.mock('../../services/DeckService', () => ({
  DeckService: {
    getDeckById: vi.fn(),
    saveDeck: vi.fn(),
    updateDeck: vi.fn(),
    cloneDeck: vi.fn(),
    getDeckScores: vi.fn(),
  },
}));

vi.mock('../../services/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ showToast: vi.fn() }),
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>
    <UserProvider>
      <ToastProvider>{children}</ToastProvider>
    </UserProvider>
  </LanguageProvider>
);

const renderDeckBuilder = () =>
  render(
    <AllProviders>
      <MemoryRouter initialEntries={['/deck-builder']}>
        <DeckBuilder />
      </MemoryRouter>
    </AllProviders>
  );

const formatMock = {
  id: 'f1',
  name: { es: 'Premodern', en: 'Premodern' },
  scryfallKey: 'premodern',
  config: { minMainDeck: 60, maxMainDeck: undefined, maxSideboard: 15, maxCopies: 4 },
  isActive: true,
};

describe('DeckBuilder', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(FormatService.getActiveFormats).mockResolvedValue([formatMock]);
    vi.mocked(CardService.getCardByName).mockResolvedValue(null);
    vi.mocked(CardService.batchSearch).mockResolvedValue({});
    vi.mocked(DeckService.getDeckById).mockResolvedValue(null);
    vi.mocked(DeckService.saveDeck).mockResolvedValue({ id: 'new-deck' });
    vi.mocked(DeckService.updateDeck).mockResolvedValue({ id: 'updated-deck' });
    vi.mocked(DeckService.cloneDeck).mockResolvedValue({ id: 'cloned-deck' });
    vi.mocked(DeckService.getDeckScores).mockResolvedValue({ scores: {} });
  });

  it('renders without crashing', () => {
    const { container } = renderDeckBuilder();
    expect(container).toBeInTheDocument();
  });

  it('shows format selector after formats load', async () => {
    renderDeckBuilder();
    await waitFor(() => expect(screen.getByText(/selecciona un formato/i)).toBeInTheDocument());
  });
});
