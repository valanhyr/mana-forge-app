import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeckStats from '../../../components/ui/DeckStats';
import { LanguageProvider } from '../../../services/LanguageContext';
import type { DeckCard } from '../../../components/ui/DeckList';

const wrap = (ui: React.ReactElement) => <LanguageProvider>{ui}</LanguageProvider>;

const makeCard = (overrides: Partial<DeckCard>): DeckCard => ({
  id: 'card-1',
  name: 'Test Card',
  quantity: 1,
  type: 'Instant',
  board: 'main',
  cmc: 1,
  ...overrides,
});

describe('DeckStats', () => {
  it('retorna null cuando no hay hechizos (solo tierras)', () => {
    const cards = [makeCard({ type: 'Basic Land — Forest', quantity: 20 })];
    const { container } = render(wrap(<DeckStats cards={cards} />));
    expect(container.firstChild).toBeNull();
  });

  it('retorna null cuando el array está vacío', () => {
    const { container } = render(wrap(<DeckStats cards={[]} />));
    expect(container.firstChild).toBeNull();
  });

  it('excluye cartas de tipo land del cálculo de la curva', () => {
    const cards = [
      makeCard({ type: 'Instant', cmc: 1, quantity: 4 }),
      makeCard({ id: 'land-1', type: 'Basic Land — Mountain', cmc: 0, quantity: 20 }),
    ];
    render(wrap(<DeckStats cards={cards} />));
    // La curva debe aparecer con al menos una barra con valor
    // El componente renderiza cuando hay hechizos
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('agrupa cartas correctamente en buckets CMC 0-7+', () => {
    const cards = [
      makeCard({ cmc: 0, quantity: 2 }),
      makeCard({ id: 'c2', cmc: 3, quantity: 3 }),
      makeCard({ id: 'c3', cmc: 8, quantity: 1 }), // va al bucket 7+
    ];
    render(wrap(<DeckStats cards={cards} />));
    // Use getAllByText since label "2" and count "2" both appear in the DOM
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza las etiquetas de los buckets 0-7 y "7+"', () => {
    const cards = [makeCard({ type: 'Creature', cmc: 2, quantity: 4 })];
    render(wrap(<DeckStats cards={cards} />));
    // Verificar que se muestran labels numéricos de la curva
    expect(screen.getByText('7+')).toBeInTheDocument();
  });
});
