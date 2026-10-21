import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LegalPageView from '../../views/legal/LegalPage';
import { LanguageProvider } from '../../services/LanguageContext';
import { LegalService } from '../../services/LegalService';

vi.mock('../../services/LegalService', () => ({
  LegalService: {
    getBySlug: vi.fn(),
  },
}));

const renderLegalPage = (slug = 'privacy-policy') =>
  render(
    <MemoryRouter initialEntries={[`/legal/${slug}`]}>
      <LanguageProvider>
        <Routes>
          <Route path="/legal/:slug" element={<LegalPageView />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('LegalPage', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(LegalService.getBySlug).mockResolvedValue({
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      lastUpdated: '2026-10-07',
      sections: [
        {
          heading: 'Introduction',
          content: '<p>Welcome to <strong>Mana Forge</strong>.</p>',
        },
        {
          heading: 'Information We Collect',
          content: '<p>We collect your data.</p>',
        },
      ],
    } as never);
  });

  it('shows a loader while fetching the page', () => {
    const { container } = renderLegalPage();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders the page title and sections once loaded', async () => {
    renderLegalPage();
    await waitFor(() => expect(screen.getByText('Privacy Policy')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 2, name: /Introduction/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Information/i })).toBeInTheDocument();
  });

  it('renders the table of contents with links to sections', async () => {
    renderLegalPage();
    await waitFor(() => expect(screen.getByText(/tabla de contenido/i)).toBeInTheDocument());
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Introduction/i })).toBeInTheDocument();
  });

  it('associates nav with an accessible name', async () => {
    renderLegalPage();
    await waitFor(() => expect(screen.getByRole('navigation')).toBeInTheDocument());
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('renders section headings as h2', async () => {
    renderLegalPage();
    await waitFor(() => screen.getByRole('heading', { level: 2, name: /Introduction/i }));
    expect(screen.getByRole('heading', { level: 2, name: /Information/i })).toBeInTheDocument();
  });

  it('renders the not-found state for an unknown slug', async () => {
    vi.mocked(LegalService.getBySlug).mockResolvedValue(null);
    renderLegalPage('no-existe');
    await waitFor(() => expect(screen.getByText(/página no encontrada/i)).toBeInTheDocument());
    expect(screen.getByText(/volver al inicio/i)).toBeInTheDocument();
  });
});