import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { ArticleService } from '../../../services/ArticleService';
import { mockArticle } from '../../mocks/handlers';

const BASE = 'http://localhost:8080';

describe('ArticleService', () => {
  beforeEach(() => {
    ArticleService.clearCache();
  });

  it('getLastArticles retorna artículos y los cachea', async () => {
    const articles = await ArticleService.getLastArticles();
    expect(Array.isArray(articles)).toBe(true);
    expect(articles[0].documentId).toBe(mockArticle.documentId);
  });

  it('getLastArticles retorna datos cacheados en la segunda llamada', async () => {
    let callCount = 0;
    server.use(
      http.get(`${BASE}/articles/latest`, () => {
        callCount++;
        return HttpResponse.json([mockArticle]);
      })
    );
    await ArticleService.getLastArticles();
    await ArticleService.getLastArticles();
    expect(callCount).toBe(1);
  });

  it('getLastArticles retorna [] si la API falla', async () => {
    server.use(http.get(`${BASE}/articles/latest`, () => new HttpResponse(null, { status: 500 })));
    const articles = await ArticleService.getLastArticles();
    expect(articles).toEqual([]);
  });

  it('getArticle retorna el artículo en caso de éxito', async () => {
    const article = await ArticleService.getArticle('art-1', 'es');
    expect(article?.documentId).toBe(mockArticle.documentId);
  });

  it('getArticle retorna null si documentId está vacío', async () => {
    const article = await ArticleService.getArticle('', 'es');
    expect(article).toBeNull();
  });

  it('getArticle retorna null si la API falla', async () => {
    server.use(http.get(`${BASE}/articles/:id`, () => new HttpResponse(null, { status: 404 })));
    const article = await ArticleService.getArticle('art-1', 'es');
    expect(article).toBeNull();
  });
});
