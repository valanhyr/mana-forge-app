import { useTranslation } from '../../hooks/use-translation';

export function Pagination({ page, size, total, onChange, isLoading = false }: {
  page: number; size: number; total: number; onChange: (page: number) => void; isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / size));
  return <div className="flex items-center justify-between gap-3 text-xs text-slate-400 py-2">
    <span>{t('page')} {page + 1} {t('of')} {pages} · {total} {t('total')}</span>
    <div className="flex gap-2">
      <button className="border border-slate-700 rounded px-3 py-1 disabled:opacity-40" disabled={page === 0 || isLoading} onClick={() => onChange(page - 1)}>{t('previous')}</button>
      <button className="border border-slate-700 rounded px-3 py-1 disabled:opacity-40" disabled={page + 1 >= pages || isLoading} onClick={() => onChange(page + 1)}>{t('next')}</button>
    </div>
  </div>;
}
