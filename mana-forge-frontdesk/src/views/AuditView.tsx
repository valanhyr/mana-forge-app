import React, { useState } from 'react';
import { useAuditPage } from '../hooks/use-audit';
import { ErrorNotice } from '../components/ui/ErrorNotice';
import { Pagination } from '../components/ui/Pagination';
import { AuditFilter } from '../components/audit/AuditFilter';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { AuditAction } from '../core/domain/audit';

export const AuditView: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [page, setPage] = useState(0);

  const logs = useAuditPage(
    selectedAction !== 'ALL' ? selectedAction as AuditAction : undefined, page
  );

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <AuditFilter
        selectedAction={selectedAction}
        onSelectAction={value => { setSelectedAction(value); setPage(0); }}
      />

      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950/40 p-1 rounded-xl">
        <ErrorNotice error={logs.error} onRetry={() => void logs.refetch()} />
        <AuditTimeline logs={logs.data?.items || []} isLoading={logs.isLoading} />
        <Pagination page={page} size={25} total={logs.data?.total || 0} onChange={setPage} isLoading={logs.isFetching} />
      </div>
    </div>
  );
};
