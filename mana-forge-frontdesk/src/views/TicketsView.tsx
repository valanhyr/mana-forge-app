import { useCallback, useEffect, useRef, useState } from 'react';
import { useTicketsPage, useTicket, useAddTicketMessage, useUpdateTicketStatus, useAssignOperator } from '../hooks/use-tickets';
import { TicketCategory, TicketPriority, TicketStatus } from '../core/domain/ticket';
import { TicketList } from '../components/tickets/TicketList';
import { TicketFilter } from '../components/tickets/TicketFilter';
import { TicketDetail } from '../components/tickets/TicketDetail';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { Pagination } from '../components/ui/Pagination';
import { useOperator } from '../hooks/use-operator';
import { useTranslation } from '../hooks/use-translation';
import { TicketEmailPanel } from './TicketEmailPanel';

export function TicketsView({ onInspectUser, initialTicketId }: {
  onInspectUser?: (userId: string) => void; initialTicketId?: string;
}) {
  const { t } = useTranslation();
  const operator = useOperator();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(initialTicketId);
  const [emailTicketId, setEmailTicketId] = useState<string>();
  const [draftVersion, setDraftVersion] = useState(0);
  const replyDirty = useRef(false);
  const emailDirty = useRef(false);
  const onReplyDraft = useCallback((dirty: boolean) => { replyDirty.current = dirty; }, []);
  const onEmailDraft = useCallback((dirty: boolean) => { emailDirty.current = dirty; }, []);
  const discardDrafts = () => {
    if ((replyDirty.current || emailDirty.current) && !window.confirm(t('discardDraft'))) return false;
    replyDirty.current = false; emailDirty.current = false; setEmailTicketId(undefined);
    setDraftVersion(value => value + 1); return true;
  };
  useEffect(() => { if (initialTicketId) setSelectedId(initialTicketId); }, [initialTicketId]);
  const list = useTicketsPage({ query: searchQuery,
    status: statusFilter === 'ALL' ? undefined : statusFilter as TicketStatus,
    priority: priorityFilter === 'ALL' ? undefined : priorityFilter as TicketPriority,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter as TicketCategory }, page);
  const activeId = selectedId || list.data?.items[0]?.id || '';
  const detail = useTicket(activeId);
  const add = useAddTicketMessage();
  const status = useUpdateTicketStatus();
  const assign = useAssignOperator();
  const busy = add.isPending || status.isPending || assign.isPending;

  return <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
    <TicketFilter searchQuery={searchQuery} onSearchChange={value => { if (discardDrafts()) { setSearchQuery(value); setPage(0); setSelectedId(undefined); } }}
      statusFilter={statusFilter} onStatusChange={value => { if (discardDrafts()) { setStatusFilter(value); setPage(0); setSelectedId(undefined); } }}
      priorityFilter={priorityFilter} onPriorityChange={value => { if (discardDrafts()) { setPriorityFilter(value); setPage(0); setSelectedId(undefined); } }}
      categoryFilter={categoryFilter} onCategoryChange={value => { if (discardDrafts()) { setCategoryFilter(value); setPage(0); setSelectedId(undefined); } }} />
    <ErrorNotice error={list.error} onRetry={() => void list.refetch()} />
    <ErrorNotice error={detail.error || add.error || status.error || assign.error} onRetry={() => void detail.refetch()} />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
      <div className="lg:col-span-5 xl:col-span-4 h-full overflow-y-auto pr-1">
        <TicketList tickets={list.data?.items || []} selectedTicketId={activeId}
          onSelectTicket={ticket => { if (ticket.id !== activeId && discardDrafts()) setSelectedId(ticket.id); }} isLoading={list.isLoading} />
        <Pagination page={page} size={25} total={list.data?.total || 0} isLoading={list.isFetching}
          onChange={value => { if (discardDrafts()) { setPage(value); setSelectedId(undefined); } }} />
      </div>
      <div className="lg:col-span-7 xl:col-span-8 h-full min-h-0">
        {detail.isLoading ? <p role="status">{t('loadingDetail')}</p> : detail.data ?
          <TicketDetail key={`${activeId}-${draftVersion}`} ticket={detail.data}
            onInspectUser={id => { if (discardDrafts()) onInspectUser?.(id); }}
            isLoading={busy || Boolean(detail.error)} currentOperator={operator || undefined}
            onDraftChange={onReplyDraft} onReplyByEmail={() => setEmailTicketId(activeId)}
            onAddMessage={async (content, isInternalNote) => {
              await add.mutateAsync({ ticketId: activeId, message: { sender: 'OPERATOR', senderName: operator?.name || '', content, isInternalNote } });
            }}
            onUpdateStatus={value => { void status.mutateAsync({ ticketId: activeId, status: value }).catch(() => {}); }}
            onAssignOperator={(operatorId, operatorName) => { void assign.mutateAsync({ ticketId: activeId, operatorId, operatorName }).catch(() => {}); }} />
          : activeId && !detail.error ? <p>{t('notFound')}</p> : null}
      </div>
    </div>
    {emailTicketId === activeId && detail.data && !detail.error && detail.data.availableChannels?.includes('EMAIL') &&
      <TicketEmailPanel key={emailTicketId} ticket={detail.data} onDraftChange={onEmailDraft}
        onClose={() => { if (!emailDirty.current || window.confirm(t('discardDraft'))) { emailDirty.current = false; setEmailTicketId(undefined); } }} />}
  </div>;
}
