import { type LegalPage } from '../core/models/LegalPage';
import legalMock from '../core/mocks/legalPages.mock.json';

type LocaleKey = 'en' | 'es';

const mock = legalMock as Record<LocaleKey, LegalPage[]>;

// TODO: replace mock with API call once Strapi collection is ready
// const response = await api.get<LegalPage>(`/legal/${slug}?locale=${locale}`);

export const LegalService = {
  getBySlug: async (slug: string, locale: string): Promise<LegalPage | null> => {
    const localeKey = (locale === 'es' ? 'es' : 'en') as LocaleKey;
    const pages = mock[localeKey] ?? mock['en'];
    return pages.find((p) => p.slug === slug) ?? null;
  },
};
