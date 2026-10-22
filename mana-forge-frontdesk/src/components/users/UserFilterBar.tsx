import { ArrowDown, ArrowUp, Filter, Search, X } from 'lucide-react';
import { User360, UserSort, UserSortDir, UserTier } from '../../core/domain/user';
import { LabelKey, useTranslation } from '../../hooks/use-translation';

const SORTS: UserSort[] = ['openTickets', 'aiUsageToday', 'totalDecks', 'username', 'createdAt', 'lastLoginAt'];
const TIERS: UserTier[] = ['FREE', 'PRO', 'PATREON'];
const STATUSES: User360['status'][] = ['ACTIVE', 'SUSPENDED', 'BANNED'];

const SORT_LABELS: Record<UserSort, LabelKey> = {
  openTickets: 'sortOpenTickets',
  aiUsageToday: 'sortAiUsageToday',
  totalDecks: 'sortTotalDecks',
  username: 'sortUsername',
  createdAt: 'sortCreatedAt',
  lastLoginAt: 'sortLastLogin',
};

const STATUS_LABELS: Record<User360['status'], LabelKey> = {
  ACTIVE: 'statusActive',
  SUSPENDED: 'statusSuspended',
  BANNED: 'statusBanned',
};

export interface UserFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: UserSort;
  dir: UserSortDir;
  onSortChange: (sort: UserSort) => void;
  onDirChange: (dir: UserSortDir) => void;
  tier?: UserTier;
  status?: User360['status'];
  quota?: 'exhausted';
  onTierChange: (tier?: UserTier) => void;
  onStatusChange: (status?: User360['status']) => void;
  onQuotaChange: (quota?: 'exhausted') => void;
  onClear: () => void;
}

const selectClass = 'rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none';

export function UserFilterBar(props: UserFilterBarProps) {
  const { t } = useTranslation();
  const hasFilters = Boolean(props.search.trim())
    || Boolean(props.tier)
    || Boolean(props.status)
    || Boolean(props.quota)
    || props.sort !== 'openTickets'
    || props.dir !== 'desc';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            aria-label={t('searchUsers')}
            value={props.search}
            onChange={(event) => props.onSearchChange(event.target.value)}
            placeholder={t('searchUsers')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <select
            aria-label={t('sortBy')}
            value={props.sort}
            onChange={(event) => props.onSortChange(event.target.value as UserSort)}
            className={selectClass}
          >
            {SORTS.map((sort) => <option key={sort} value={sort}>{t(SORT_LABELS[sort])}</option>)}
          </select>
          <button
            type="button"
            aria-label={props.dir === 'desc' ? t('sortDescending') : t('sortAscending')}
            title={props.dir === 'desc' ? t('sortDescending') : t('sortAscending')}
            onClick={() => props.onDirChange(props.dir === 'desc' ? 'asc' : 'desc')}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:border-slate-700 hover:text-white"
          >
            {props.dir === 'desc'
              ? <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
              : <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        </div>

        <select
          aria-label={t('filterTier')}
          value={props.tier ?? ''}
          onChange={(event) => props.onTierChange(event.target.value ? event.target.value as UserTier : undefined)}
          className={selectClass}
        >
          <option value="">{t('allTiers')}</option>
          {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
        </select>

        <select
          aria-label={t('filterStatus')}
          value={props.status ?? ''}
          onChange={(event) => props.onStatusChange(
            event.target.value ? event.target.value as User360['status'] : undefined)}
          className={selectClass}
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>{t(STATUS_LABELS[status])}</option>
          ))}
        </select>

        <select
          aria-label={t('filterQuota')}
          value={props.quota ?? ''}
          onChange={(event) => props.onQuotaChange(
            event.target.value === 'exhausted' ? 'exhausted' : undefined)}
          className={selectClass}
        >
          <option value="">{t('allQuotas')}</option>
          <option value="exhausted">{t('quotaExhausted')}</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={props.onClear}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs text-slate-300 hover:border-slate-700 hover:text-white"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            {t('clearFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
