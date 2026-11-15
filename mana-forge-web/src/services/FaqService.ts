import { api } from './api';
import type { FaqTopic } from '../core/models/Faq';
import type { Locale } from './LanguageContext';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTopic = (value: unknown): value is FaqTopic =>
  isRecord(value) && typeof value.id === 'string' && typeof value.title === 'string' &&
  Array.isArray(value.questions) && value.questions.every((question: unknown) =>
    isRecord(question) && typeof question.id === 'string' &&
    typeof question.question === 'string' && typeof question.answer === 'string'
  );

export const FaqService = {
  getTopics: async (locale: Locale): Promise<FaqTopic[]> => {
    const response = await api.get<unknown>('/v1/content/faqs', { params: { locale } });
    if (!Array.isArray(response.data) || !response.data.every(isTopic)) {
      throw new Error('Invalid FAQ response');
    }
    return response.data;
  },
};
