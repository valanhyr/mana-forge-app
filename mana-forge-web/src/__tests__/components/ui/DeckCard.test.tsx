import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeckCard from '../../../components/ui/DeckCard';
import type { DeckSearchResult } from '../../../services/DeckService';
import { vi } from 'vitest';

// Mock ManaCost para evitar peticiones HTTP en este test
vi.mock('../../../services/ManaSymbolService', () => ({
  ManaSymbolService: { getAll: vi.fn().mockResolvedValue({}) },
}));

const mockDeck: DeckSearchResult = {
  id: 'deck-1',
  name: 'Sligh Premodern',
  formatName: 'Premodern',
  ownerUsername: 'testuser',
  colors: ['R'],
  featuredScryfallId: 'sc-1',
  likesCount: 7,
};

const renderCard = (deck = mockDeck) =>
  render(
    <MemoryRouter>
      <DeckCard deck={deck} />
    </MemoryRouter>
  );

describe('DeckCard', () => {
  it('renderiza el nombre del deck', () => {
    renderCard();
    expect(screen.getByText('Sligh Premodern')).toBeInTheDocument();
  });

  it('renderiza el formato y el propietario', () => {
    renderCard();
    expect(screen.getByText('Premodern')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('renderiza el placeholder "MF" cuando no hay cardArtUrl', () => {
    renderCard({ ...mockDeck, cardArtUrl: undefined });
    expect(screen.getByText('MF')).toBeInTheDocument();
  });

  it('el link apunta a /deck-viewer/:id', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/deck-viewer/deck-1');
  });

  it('muestra likesCount cuando es mayor a 0', () => {
    renderCard();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
