import React, { useState } from 'react';
import { useAuditLog } from '../hooks/use-audit';
import { AuditFilter } from '../components/audit/AuditFilter';
import { AuditTimeline } from '../components/audit/AuditTimeline';
import { AuditAction } from '../core/domain/audit';

export const AuditView: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState('ALL');

  const { data: logs = [], isLoading } = useAuditLog(
    selectedAction !== 'ALL' ? { action: selectedAction as AuditAction } : undefined
  );

  return (
    <div className="space-y-4 h-[calc(100vh-7rem)] flex flex-col">
      <AuditFilter
        selectedAction={selectedAction}
        onSelectAction={setSelectedAction}
      />

      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-950/40 p-1 rounded-xl">
        <AuditTimeline logs={logs} isLoading={isLoading} />
      </div>
    </div>
  );
};
