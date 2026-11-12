import faqs from '../data/faqs.json';
import type { FaqTopic } from '../core/models/Faq';
import type { Locale } from './LanguageContext';

const localizedFaqs: Record<Locale, FaqTopic[]> = faqs;

export const FaqService = {
  getTopics: (locale: Locale): FaqTopic[] => localizedFaqs[locale],
};
