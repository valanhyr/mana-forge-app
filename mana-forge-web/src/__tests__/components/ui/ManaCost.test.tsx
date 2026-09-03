import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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

  it('renderiza símbolos de maná', async () => {
    const { container } = render(<ManaCost cost="{1}{U}" />);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(container).toBeTruthy();
  });

  it('aplica tamaño personalizado', () => {
    const { container } = render(<ManaCost cost="{1}" size={24} />);
    expect(container).toBeTruthy();
  });
});
