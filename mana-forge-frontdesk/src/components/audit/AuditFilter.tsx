import React from 'react';
import { Filter } from 'lucide-react';
import { useTranslation } from '../../hooks/use-translation';

interface AuditFilterProps {
  selectedAction: string;
  onSelectAction: (action: string) => void;
}

export const AuditFilter: React.FC<AuditFilterProps> = ({
  selectedAction,
  onSelectAction,
}) => {
  const { t } = useTranslation();
  const actions: Array<{ value: string; label: string }> = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'USER_LOGIN', label: 'User Login' },
    { value: 'USER_STATUS_UPDATE', label: 'Status Updates' },
    { value: 'AI_QUOTA_RESET', label: 'Quota Resets' },
    { value: 'TICKET_CREATED', label: 'Ticket Creations' },
    { value: 'TICKET_STATUS_CHANGED', label: 'Ticket Status Changes' },
    { value: 'TICKET_NOTE_ADDED', label: 'Internal Notes' },
    { value: 'TICKET_MESSAGE_ADDED', label: t('auditReplies') },
    { value: 'TICKET_ASSIGNED', label: t('auditAssignments') },
    { value: 'EMAIL_SENT', label: 'Emails Dispatched' },
    { value: 'EMAIL_FAILED', label: t('auditEmailFailures') },
    { value: 'DECK_IMPORT_FAILED', label: 'Deck Import Errors' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Filter className="w-4 h-4 text-indigo-400" />
        <span className="font-medium">Filter Audit Events:</span>
      </div>

      <select
        value={selectedAction}
        onChange={(e) => onSelectAction(e.target.value)}
        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
      >
        {actions.map((act) => (
          <option key={act.value} value={act.value}>
            {act.label}
          </option>
        ))}
      </select>
    </div>
  );
};
