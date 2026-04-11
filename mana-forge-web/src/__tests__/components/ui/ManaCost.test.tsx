import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManaCost from '../../../components/ui/ManaCost';
import { vi } from 'vitest';

// Mock del servicio para no hacer peticiones HTTP en tests de componente
vi.mock('../../../services/ManaSymbolService', () => ({
  ManaSymbolService: {
    getAll: vi.fn().mockResolvedValue({
      '{W}': 'https://svgs.scryfall.io/card-symbols/W.svg',
      '{U}': 'https://svgs.scryfall.io/card-symbols/U.svg',
      '{B}': 'https://svgs.scryfall.io/card-symbols/B.svg',
      '{R}': 'https://svgs.scryfall.io/card-symbols/R.svg',
      '{G}': 'https://svgs.scryfall.io/card-symbols/G.svg',
    }),
  },
}));

describe('ManaCost', () => {
  it('retorna null (no renderiza nada) para cost string vacío', () => {
    const { container } = render(<ManaCost cost="" />);
    expect(container.firstChild).toBeNull();
  });

  it('tokeniza {W}{U}{B}{R}{G} en 5 tokens', async () => {
    render(<ManaCost cost="{W}{U}{B}{R}{G}" />);
    // Esperamos a que los símbolos carguen
    const imgs = await screen.findAllByRole('img');
    expect(imgs).toHaveLength(5);
  });

  it('renderiza img cuando el símbolo existe en el mapa', async () => {
    render(<ManaCost cost="{R}" />);
    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('alt', '{R}');
    expect(img).toHaveAttribute('src', expect.stringContaining('svg'));
  });

  it('renderiza span de fallback cuando el símbolo no está en el mapa', async () => {
    render(<ManaCost cost="{X}" />);
    // {X} no está en el mapa mockeado
    const span = await screen.findByText('{X}');
    expect(span.tagName).toBe('SPAN');
  });
});
