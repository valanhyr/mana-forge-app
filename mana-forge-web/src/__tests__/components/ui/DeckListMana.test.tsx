import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeckList, { type DeckCard } from '../../../components/ui/DeckList';
import { ManaSymbolService } from '../../../services/ManaSymbolService';

vi.mock('../../../hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const card = (over: Partial<DeckCard> = {}): DeckCard => ({
  id: 'c1',
  name: 'Lightning Bolt',
  quantity: 1,
  manaCost: '{R}{W}',
  cmc: 2,
  type: 'Instant',
  board: 'main',
  ...over,
});

describe('DeckList - costes de maná', () => {
  beforeEach(() => ManaSymbolService.clearCache());

  it('pinta el coste como imágenes de símbolos, no como texto {R}', async () => {
    render(<DeckList cards={[card()]} hideToolbar />);
    const reds = await screen.findAllByAltText('{R}');
    expect(reds.length).toBeGreaterThanOrEqual(1);
    expect(reds[0]).toHaveAttribute('src', expect.stringContaining('svg'));
    expect(screen.getAllByAltText('{W}').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('{R}')).not.toBeInTheDocument();
  });
});
