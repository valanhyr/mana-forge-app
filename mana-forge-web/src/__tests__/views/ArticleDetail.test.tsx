import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ArticleDetail from '../../views/articles/articleDetail';
import { LanguageProvider } from '../../services/LanguageContext';
import { ArticleService } from '../../services/ArticleService';

vi.mock('../../services/ArticleService', () => ({
  ArticleService: {
    getArticle: vi.fn(),
  },
}));

const renderArticle = (id = 'art-1') =>
  render(
    <MemoryRouter initialEntries={[`/articles/${id}`]}>
      <LanguageProvider>
        <Routes>
          <Route path="/articles/:documentId" element={<ArticleDetail />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );

describe('ArticleDetail', () => {
  beforeEach(() => {
    localStorage.setItem('app_locale', 'es');
    vi.mocked(ArticleService.getArticle).mockResolvedValue({
      documentId: 'art-1',
      title: 'Cómo construir un mazo de Goblins',
      subtitle: 'Guía rápida para Premodern',
      imageUrl: 'https://example.com/card.jpg',
      author: 'Valan',
      content: '<p>Contenido del artículo con <strong>HTML</strong>.</p>',
      publishedAt: '2026-10-01T10:00:00Z',
    } as never);
  });

  it('shows a loader while fetching the article', () => {
    const { container } = renderArticle();
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });

  it('renders the article title and metadata once loaded', async () => {
    renderArticle();
    await waitFor(() => expect(screen.getByText('Cómo construir un mazo de Goblins')).toBeInTheDocument());
    expect(screen.getByText(/Valan/i)).toBeInTheDocument();
    expect(screen.getByText(/2026/i)).toBeInTheDocument();
  });

  it('renders the article content', async () => {
    renderArticle();
    await waitFor(() => expect(screen.getByText(/Contenido del artículo/i)).toBeInTheDocument());
  });

  it('associates nav with an accessible name on not-found', async () => {
    vi.mocked(ArticleService.getArticle).mockResolvedValue(null);
    renderArticle('no-existe');
    await waitFor(() => expect(screen.getByText(/artículo no encontrado/i)).toBeInTheDocument());
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('aria-label')).toBeTruthy();
  });

  it('shows the back home link on not-found', async () => {
    vi.mocked(ArticleService.getArticle).mockResolvedValue(null);
    renderArticle('no-existe');
    await waitFor(() => expect(screen.getByRole('link', { name: /volver al inicio/i })).toBeInTheDocument());
  });
});