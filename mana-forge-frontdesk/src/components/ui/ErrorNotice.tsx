import { ApiError } from '../../infrastructure/api/api-client';
import { useTranslation } from '../../hooks/use-translation';

export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  if (!error) return null;
  const message = error instanceof ApiError
    ? error.code === 'INVALID_RESPONSE' ? t('invalidResponse') : error.code === 'TIMEOUT' ? t('timeout') : error.status === 0 ? t('networkError')
      : error.status === 409 ? t('conflict') : error.message
    : error instanceof Error ? error.message : t('unknownError');
  return <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
    {message}
    {onRetry && <button type="button" onClick={onRetry} className="ml-3 underline">{t('retry')}</button>}
  </div>;
}
