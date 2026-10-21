import type { AnalysisQuota } from '../../services/DeckService';
import { useTranslation } from '../../hooks/useTranslation';

export default function AnalysisQuotaSummary({ quota }: { quota: AnalysisQuota | null }) {
  const { t, locale } = useTranslation();
  if (!quota) return <p className="text-sm text-zinc-500">{t('usage.unavailable')}</p>;
  const reset = quota.resetsAt ? new Date(quota.resetsAt) : null;
  return <div className="text-sm space-y-1" aria-live="polite">
    <p className={quota.remaining === 0 ? 'text-red-400' : 'text-zinc-300'}>
      {quota.remaining === null || quota.limit === null ? t('usage.unlimited')
        : t('usage.remaining', { remaining: quota.remaining, limit: quota.limit })}
    </p>
    {reset && Number.isFinite(reset.getTime()) && <p className="text-xs text-zinc-500">
      {t('usage.resets', { time: new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(reset) })}
    </p>}
  </div>;
}
