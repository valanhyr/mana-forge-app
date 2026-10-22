import { useEffect, useState } from 'react';
import { useUsersPage, useUser, useUpdateUserStatus, useResetAiQuota } from '../hooks/use-users';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { UserCard } from '../components/users/UserCard';
import { UserFilterBar } from '../components/users/UserFilterBar';
import { User360View } from '../components/users/User360View';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { Pagination } from '../components/ui/Pagination';
import { useTranslation } from '../hooks/use-translation';
import { UserListFilters } from '../core/domain/user';

const DEFAULT_FILTERS: UserListFilters = { query: '', sort: 'openTickets', dir: 'desc' };

export function UsersView({ initialUserId }: { initialUserId?: string }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filters, setFilters] = useState<UserListFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(initialUserId);
  useEffect(() => { if (initialUserId) setSelectedId(initialUserId); }, [initialUserId]);
  useEffect(() => {
    setFilters((current) => current.query === debouncedSearch ? current : { ...current, query: debouncedSearch });
    setPage(0);
  }, [debouncedSearch]);

  const list = useUsersPage(filters, page);
  const detail = useUser(selectedId || list.data?.items[0]?.id || '');
  const status = useUpdateUserStatus();
  const quota = useResetAiQuota();

  const applyFilters = (patch: Partial<UserListFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(0);
  };
  const clearFilters = () => {
    setSearch('');
    setFilters(DEFAULT_FILTERS);
    setPage(0);
  };

  return <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
    <UserFilterBar search={search} onSearchChange={setSearch}
      sort={filters.sort ?? 'openTickets'} dir={filters.dir ?? 'desc'}
      onSortChange={(sort) => applyFilters({ sort })} onDirChange={(dir) => applyFilters({ dir })}
      tier={filters.tier} status={filters.status} quota={filters.quota}
      onTierChange={(tier) => applyFilters({ tier })} onStatusChange={(value) => applyFilters({ status: value })}
      onQuotaChange={(value) => applyFilters({ quota: value })} onClear={clearFilters} />
    <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
    <ErrorNotice error={detail.error || status.error || quota.error} onRetry={() => void detail.refetch()} />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
      <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto space-y-2">
        {list.data?.items.length === 0 && !list.isLoading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            <p>{t('noUsersMatch')}</p>
            <button type="button" onClick={clearFilters}
              className="mt-3 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-500 hover:text-white">
              {t('clearFilters')}
            </button>
          </div>
        ) : list.data?.items.map(user => (
          <UserCard key={user.id} user={user} isSelected={detail.data?.id === user.id}
            onSelect={value => setSelectedId(value.id)} />
        ))}
        <Pagination page={page} size={25} total={list.data?.total || 0} isLoading={list.isFetching}
          onChange={setPage} />
      </div>
      <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0">
        {detail.isLoading ? <p role="status">{t('loadingDetail')}</p> : detail.data ?
          <User360View user={detail.data} isLoading={status.isPending || quota.isPending}
            onResetQuota={id => { void quota.mutateAsync(id).catch(() => {}); }}
            onUpdateStatus={(userId, value) => { void status.mutateAsync({ userId, status: value }).catch(() => {}); }} />
          : selectedId && !detail.error ? <p>{t('notFound')}</p> : null}
      </div>
    </div>
  </div>;
}
