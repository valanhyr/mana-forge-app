import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManaCost from '../../../components/ui/ManaCost';

vi.mock('../../../services/ManaSymbolService', () => ({
  ManaSymbolService: {
    getAll: vi.fn().mockResolvedValue({
      '{1}': 'https://example.com/mana-1.svg',
      '{U}': 'https://example.com/mana-blue.svg',
    }),
  },
}));

describe('ManaCost', () => {
  it('retorna null si cost está vacío', () => {
    const { container } = render(<ManaCost cost="" />);
    expect(container.firstChild).toBeNull();
  });

  it('sustituye cada símbolo por su imagen', async () => {
    render(<ManaCost cost="{1}{U}" />);
    expect(await screen.findByAltText('{1}')).toHaveAttribute('src', 'https://example.com/mana-1.svg');
    expect(screen.getByAltText('{U}')).toHaveAttribute('src', 'https://example.com/mana-blue.svg');
  });

  it('muestra el texto del símbolo si no hay imagen para él', async () => {
    render(<ManaCost cost="{U}{X}" />);
    expect(await screen.findByAltText('{U}')).toBeInTheDocument();
    expect(screen.getByText('{X}')).toBeInTheDocument();
  });

  it('aplica el tamaño personalizado a las imágenes', async () => {
    render(<ManaCost cost="{1}" size={24} />);
    const img = await screen.findByAltText('{1}');
    expect(img).toHaveStyle({ width: '24px', height: '24px' });
  });
});
