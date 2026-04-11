import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManaCurve from '../../../components/ui/ManaCurve';

const makeCards = (entries: Array<{ cmc: number; quantity: number }>) =>
  entries.map((e) => ({ cmc: e.cmc, quantity: e.quantity }));

describe('ManaCurve', () => {
  it('renderiza 7 columnas (CMC 0 a 6+)', () => {
    render(<ManaCurve cards={[]} />);
    const labels = ['0', '1', '2', '3', '4', '5', '6+'];
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('agrupa cartas con CMC >= 6 en el bucket 6+', () => {
    const cards = makeCards([
      { cmc: 6, quantity: 2 },
      { cmc: 7, quantity: 1 },
      { cmc: 10, quantity: 1 },
    ]);
    render(<ManaCurve cards={cards} />);
    // The bar title encodes both bucket label and count — no ambiguity
    expect(screen.getByTitle('CMC 6+: 4 cards')).toBeInTheDocument();
  });

  it('muestra el conteo correcto por cada bucket', () => {
    const cards = makeCards([
      { cmc: 1, quantity: 4 },
      { cmc: 2, quantity: 3 },
    ]);
    render(<ManaCurve cards={cards} />);
    expect(screen.getByTitle('CMC 1: 4 cards')).toBeInTheDocument();
    expect(screen.getByTitle('CMC 2: 3 cards')).toBeInTheDocument();
  });

  it('funciona sin errores con array de cartas vacío', () => {
    expect(() => render(<ManaCurve cards={[]} />)).not.toThrow();
  });

  it('muestra "Mana Curve" como título', () => {
    render(<ManaCurve cards={[]} />);
    expect(screen.getByText('Mana Curve')).toBeInTheDocument();
  });
});
