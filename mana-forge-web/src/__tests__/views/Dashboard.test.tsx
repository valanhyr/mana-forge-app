import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../views/dashboard/Dashboard';
import { LanguageProvider } from '../../services/LanguageContext';
import { ToastProvider } from '../../services/ToastContext';
import { DeckService } from '../../services/DeckService';
import { ScryfallService } from '../../services/ScryfallService';
import { FormatService } from '../../services/FormatService';
import { ArticleService } from '../../services/ArticleService';

const dailyDeck = {
  id: 'd1',
  deck_name: 'Mazo de prueba',
  format_name: 'Premodern',
  archetype: 'Burn',
  main_deck: [{ name: 'Lightning Bolt', quantity: 4 }],
  userRating: 0,
  averageRating: null,
  totalRatings: 0,
};

vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ isAuthenticated: false }),
}));
vi.mock('../../services/UserContext', () => ({
  useUser: () => ({ isAuthenticated: false }),
}));

const setup = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <ToastProvider>
          <Dashboard />
        </ToastProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.spyOn(DeckService, 'getDailyDeck').mockResolvedValue(dailyDeck as never);
    vi.spyOn(DeckService, 'getFeaturedDeck').mockResolvedValue(null);
    vi.spyOn(ScryfallService, 'getCardByName').mockResolvedValue(null);
    vi.spyOn(FormatService, 'getCMSAllFormats').mockResolvedValue([]);
    vi.spyOn(ArticleService, 'getLastArticles').mockResolvedValue([]);
  });

  it('shows the daily deck once loaded', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Mazo de prueba')).toBeInTheDocument());
  });

  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    setup();
    await waitFor(() => expect(screen.getByText('Mazo de prueba')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ver mazo completo/i }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /puntuar/i }).length).toBeGreaterThan(0));
  };

  it('offers five rating stars with accessible names', async () => {
    const user = userEvent.setup();
    await openModal(user);
    expect(screen.getByRole('button', { name: /puntuar con 1 de 5/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /puntuar con 5 de 5/i })).toBeInTheDocument();
  });

  it('does not steal the focus outline on the rating stars', async () => {
    const user = userEvent.setup();
    await openModal(user);
    const star = screen.getByRole('button', { name: /puntuar con 3 de 5/i });
    expect(star).not.toHaveClass('focus:outline-none');
    expect(star.className).toContain('focus-visible:ring');
  });

  it('closes the deck modal with the close button', async () => {
    const user = userEvent.setup();
    await openModal(user);
    await user.click(screen.getByRole('button', { name: /^cerrar$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /puntuar con 1 de 5/i })).not.toBeInTheDocument()
    );
  });

  it('shows the empty article state rather than crashing when there are none', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Mazo de prueba')).toBeInTheDocument());
    expect(screen.queryAllByRole('link', { name: /leer más/i })).toHaveLength(0);
  });
});