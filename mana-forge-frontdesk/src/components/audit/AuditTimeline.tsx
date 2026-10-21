import React from 'react';
import { AuditEntry } from '../../core/domain/audit';
import {
  Clock,
  Shield,
  User,
  Cpu,
  Mail,
  AlertOctagon,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface AuditTimelineProps {
  logs: AuditEntry[];
  isLoading?: boolean;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ logs, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No audit entries found.
      </div>
    );
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'AI_QUOTA_RESET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-3 h-3" />
            AI QUOTA RESET
          </span>
        );
      case 'DECK_IMPORT_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" />
            IMPORT FAILED
          </span>
        );
      case 'EMAIL_SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Mail className="w-3 h-3" />
            EMAIL SENT
          </span>
        );
      case 'TICKET_STATUS_CHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <CheckCircle className="w-3 h-3" />
            TICKET STATUS
          </span>
        );
      case 'TICKET_NOTE_ADDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-3 h-3" />
            INTERNAL NOTE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-2.5">
      {logs.map((log) => {
        const isOperator = log.actor.role === 'OPERATOR';
        return (
          <div
            key={log.id}
            className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isOperator
                    ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isOperator ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200">
                    {log.actor.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({log.actor.role})
                  </span>
                  {getActionBadge(log.action)}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{log.details}</p>

                {log.targetUserName && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Target: <span className="text-slate-400">{log.targetUserName}</span>{' '}
                    ({log.targetUserId})
                  </div>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0 pt-0.5">
              <Clock className="w-3 h-3" />
              <span>{new Date(log.timestamp).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
