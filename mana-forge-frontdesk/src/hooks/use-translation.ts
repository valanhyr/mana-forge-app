import labels from '../labels.json';

export type LabelKey = keyof typeof labels.en;
export function useTranslation() {
  let locale: 'es' | 'en' = 'en';
  try { if (localStorage.getItem('app_locale') === 'es') locale = 'es'; }
  catch { /* Private browsing can disable localStorage; it is not required for authentication. */ }
  return { t: (key: LabelKey) => labels[locale][key] };
}
