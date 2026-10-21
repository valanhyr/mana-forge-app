import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckExplorer from '../../views/deck-explorer/DeckExplorer';
import { LanguageProvider } from '../../services/LanguageContext';
import { DeckService } from '../../services/DeckService';
import { FormatService } from '../../services/FormatService';

vi.mock('../../services/DeckService', () => ({
  DeckService: {
    searchDecks: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/FormatService', () => ({
  FormatService: {
    getActiveFormats: vi.fn().mockResolvedValue([]),
  },
}));

const renderDeckExplorer = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <DeckExplorer />
      </LanguageProvider>
    </MemoryRouter>
  );

describe('DeckExplorer', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(DeckService.searchDecks).mockResolvedValue([]);
    vi.mocked(FormatService.getActiveFormats).mockResolvedValue([]);
  });

  it('shows a loader while fetching decks', () => {
    const { container } = renderDeckExplorer();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders the empty state when no decks found', async () => {
    renderDeckExplorer();
    await waitFor(() => expect(screen.getByText(/no se encontraron mazos/i)).toBeInTheDocument());
  });

  it('labels the search input', async () => {
    renderDeckExplorer();
    await waitFor(() => expect(screen.getByLabelText(/buscar/i)).toBeInTheDocument());
  });

  it('labels the format selector', async () => {
    renderDeckExplorer();
    await waitFor(() => expect(screen.getByLabelText(/formato/i)).toBeInTheDocument());
  });

  it('labels the sort selector', async () => {
    renderDeckExplorer();
    await waitFor(() => expect(screen.getByLabelText(/ordenar/i)).toBeInTheDocument());
  });

  it('renders deck cards when results are returned', async () => {
    vi.mocked(DeckService.searchDecks).mockResolvedValue([
      {
        id: 'd1',
        name: 'Test Deck',
        format: 'Premodern',
        likesCount: 5,
        featuredScryfallId: undefined,
      } as never,
    ]);
    renderDeckExplorer();
    await waitFor(() => expect(screen.getByText('Test Deck')).toBeInTheDocument());
  });
});