import type { SEOData } from '../../components/ui/SEO';

export interface FormatConfig {
  minMainDeck: number;
  maxMainDeck?: number;
  maxSideboard: number;
  maxCopies: number;
}

export interface Format {
  id: string;
  name: Record<string, string>;
  scryfallKey: string;
  config: FormatConfig;
  isActive: boolean;
}

export interface FormatDetail {
  mongoId: string;
  slug: string;
  title: string;
  subtitle: string;
  description: FormatSection;
  rules: FormatSection;
  imageUrl: string;
  seo?: SEOData;
}
export interface FormatCMSBase {
  mongoId: string;
  title: string;
  imageUrl: string;
  description: string;
}
export interface FormatSection {
  name: string;
  title: string;
  description: string;
  rules: FormatRule[];
}
export interface FormatRule {
  id: number;
  text: string;
}
