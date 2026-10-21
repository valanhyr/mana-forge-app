import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FormatDetail from '../../views/formats/FormatDetail';
import { LanguageProvider } from '../../services/LanguageContext';
import { FormatService } from '../../services/FormatService';
import { CardService } from '../../services/CardService';

vi.mock('../../services/FormatService', () => ({
  FormatService: {
    getCMSAllFormats: vi.fn(),
    getCMSFormatDetail: vi.fn(),
  },
}));

vi.mock('../../services/CardService', () => ({
  CardService: {
    getBannedcards: vi.fn(),
  },
}));

const renderFormat = (formatName = 'premodern') =>
  render(
    <MemoryRouter initialEntries={[`/formats/${formatName}`]}>
      <LanguageProvider>
        <Routes>
          <Route path="/formats/:formatName" element={<FormatDetail />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('FormatDetail', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(FormatService.getCMSAllFormats).mockResolvedValue([
      { mongoId: 'f1', slug: 'premodern', title: 'Premodern', subtitle: 'Old school', imageUrl: 'https://example.com/img.jpg' },
    ]);
    vi.mocked(FormatService.getCMSFormatDetail).mockResolvedValue({
      mongoId: 'f1',
      slug: 'premodern',
      title: 'Premodern',
      subtitle: 'Formato antiguo y clásico',
      imageUrl: 'https://example.com/img.jpg',
      description: {
        name: 'description',
        title: 'Descripción',
        description: 'Este es el formato premoderno clásico.',
      },
      rules: {
        name: 'rules',
        title: 'Reglas principales',
        rules: [{ id: 1, text: 'Regla 1: Cartas antiguas' }],
      },
      metadata: {
        minDeckSize: 60,
        maxDeckSize: undefined,
        maxCopies: 4,
        sideboardSize: 15,
      },
    } as never);
    vi.mocked(CardService.getBannedcards).mockResolvedValue([]);
  });

  it('shows a loader while fetching format data', () => {
    const { container } = renderFormat();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders format title and subtitle once loaded', async () => {
    renderFormat();
    await waitFor(() => expect(screen.getByText('Premodern')).toBeInTheDocument());
    expect(screen.getByText(/Formato antiguo/i)).toBeInTheDocument();
  });

  it('renders format description and rules', async () => {
    renderFormat();
    await waitFor(() => expect(screen.getByText(/Este es el formato/i)).toBeInTheDocument());
    expect(screen.getByText(/Reglas principales/i)).toBeInTheDocument();
  });

  it('renders the banlist button with accessible name', async () => {
    renderFormat();
    await waitFor(() => expect(screen.getByRole('button', { name: /ver banlist/i })).toBeInTheDocument());
  });

  it('renders the not-found state for unknown format', async () => {
    vi.mocked(FormatService.getCMSFormatDetail).mockResolvedValue({} as never);
    renderFormat('no-existe');
    await waitFor(() => expect(screen.getByText(/formato no encontrado/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /volver al inicio/i })).toBeInTheDocument();
  });
});