import type { SEOData } from '../../components/ui/SEO';

export interface Article {
  documentId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  author?: string;
  content?: string;
  publishedAt?: string;
  seo?: SEOData;
}
