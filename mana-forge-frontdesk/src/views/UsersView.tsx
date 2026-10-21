import { useEffect, useState } from 'react';
import { useUsersPage, useUser, useUpdateUserStatus, useResetAiQuota } from '../hooks/use-users';
import { UserCard } from '../components/users/UserCard';
import { User360View } from '../components/users/User360View';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { Pagination } from '../components/ui/Pagination';
import { useTranslation } from '../hooks/use-translation';

export function UsersView({ initialUserId }: { initialUserId?: string }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(initialUserId);
  useEffect(() => { if (initialUserId) setSelectedId(initialUserId); }, [initialUserId]);
  const list = useUsersPage(search, page);
  const detail = useUser(selectedId || list.data?.items[0]?.id || '');
  const status = useUpdateUserStatus();
  const quota = useResetAiQuota();
  return <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
    <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); setSelectedId(undefined); }}
      placeholder={t('searchUsers')} className="rounded-lg border border-slate-800 bg-slate-900 p-3" />
    <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
    <ErrorNotice error={detail.error || status.error || quota.error} onRetry={() => void detail.refetch()} />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
      <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto space-y-2">
        {list.data?.items.map(user => <UserCard key={user.id} user={user} isSelected={detail.data?.id === user.id} onSelect={value => setSelectedId(value.id)} />)}
        <Pagination page={page} size={25} total={list.data?.total || 0} isLoading={list.isFetching}
          onChange={value => { setPage(value); setSelectedId(undefined); }} />
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
