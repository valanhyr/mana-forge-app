import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  date: '2026-11-18',
  deck_name: 'Mazo de prueba',
  format_name: 'Premodern',
  archetype: 'Burn',
  main_deck: [{ name: 'Lightning Bolt', quantity: 4 }],
  userRating: 0,
  averageRating: null,
  totalRatings: 0,
};

const session = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../../services/UserContext', () => ({
  useUser: () => session,
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
    vi.restoreAllMocks();
    session.isAuthenticated = false;
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

  it('renders independent, accessible buttons for the card and five ratings', async () => {
    setup();
    const open = await screen.findByRole('button', { name: /ver mazo completo/i });
    expect(open.querySelector('button')).toBeNull();
    const stars = screen.getAllByRole('button', { name: /puntuar con \d de 5 estrellas/i });
    expect(stars).toHaveLength(5);
    for (const star of stars) {
      expect(open).not.toContainElement(star);
      expect(star).not.toHaveClass('focus:outline-none');
      expect(star.className).toContain('focus-visible:ring');
    }
  });

  it('uses translated accessible names for the card ratings', async () => {
    localStorage.setItem('app_locale', 'en');
    setup();
    expect(await screen.findByRole('button', { name: 'Rate 1 of 5 stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rate 5 of 5 stars' })).toBeInTheDocument();
  });

  it('opens the deck card with Enter and Space', async () => {
    const user = userEvent.setup();
    setup();
    const open = await screen.findByRole('button', { name: /ver mazo completo/i });
    open.focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('button', { name: /^cerrar$/i }));
    open.focus();
    await user.keyboard('[Space]');
    expect(await screen.findByRole('button', { name: /^cerrar$/i })).toBeInTheDocument();
  });

  it('rates from the card without opening the modal when signed in', async () => {
    session.isAuthenticated = true;
    const rate = vi.spyOn(DeckService, 'rateDailyDeck').mockResolvedValue({ ...dailyDeck, userRating: 3 } as never);
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole('button', { name: /puntuar con 3 de 5 estrellas/i }));
    await waitFor(() => expect(rate).toHaveBeenCalledExactlyOnceWith('2026-11-18', 3));
    expect(screen.getAllByRole('heading', { name: 'Mazo de prueba' })).toHaveLength(1);
  });

  it('rates from the card with the keyboard without opening the modal', async () => {
    session.isAuthenticated = true;
    const rate = vi.spyOn(DeckService, 'rateDailyDeck').mockResolvedValue({ ...dailyDeck, userRating: 4 } as never);
    const user = userEvent.setup();
    setup();
    const star = await screen.findByRole('button', { name: /puntuar con 4 de 5 estrellas/i });
    star.focus();
    await user.keyboard('[Space]');
    await waitFor(() => expect(rate).toHaveBeenCalledExactlyOnceWith('2026-11-18', 4));
    expect(screen.getAllByRole('heading', { name: 'Mazo de prueba' })).toHaveLength(1);
  });

  it('asks visitors to log in rather than rating or opening the modal', async () => {
    const rate = vi.spyOn(DeckService, 'rateDailyDeck');
    const user = userEvent.setup();
    setup();
    await user.click(await screen.findByRole('button', { name: /puntuar con 2 de 5 estrellas/i }));
    expect(await screen.findByText('Inicia sesión para puntuar')).toBeInTheDocument();
    expect(rate).not.toHaveBeenCalled();
    expect(screen.getAllByRole('heading', { name: 'Mazo de prueba' })).toHaveLength(1);
  });

  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    setup();
    await waitFor(() => expect(screen.getByText('Mazo de prueba')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ver mazo completo/i }));
    const close = await screen.findByRole('button', { name: /^cerrar$/i });
    const modal = close.closest<HTMLElement>('.fixed');
    expect(modal).not.toBeNull();
    return modal!;
  };

  it('offers five rating stars with accessible names', async () => {
    const user = userEvent.setup();
    const modal = await openModal(user);
    expect(within(modal).getByRole('button', { name: /puntuar con 1 de 5/i })).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: /puntuar con 5 de 5/i })).toBeInTheDocument();
  });

  it('does not steal the focus outline on the rating stars', async () => {
    const user = userEvent.setup();
    const modal = await openModal(user);
    const star = within(modal).getByRole('button', { name: /puntuar con 3 de 5/i });
    expect(star).not.toHaveClass('focus:outline-none');
    expect(star.className).toContain('focus-visible:ring');
  });

  it('closes the deck modal with the close button', async () => {
    const user = userEvent.setup();
    const modal = await openModal(user);
    await user.click(within(modal).getByRole('button', { name: /^cerrar$/i }));
    await waitFor(() => expect(modal).not.toBeInTheDocument());
  });

  it('shows the empty article state rather than crashing when there are none', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Mazo de prueba')).toBeInTheDocument());
    expect(screen.queryAllByRole('link', { name: /leer más/i })).toHaveLength(0);
  });
});
