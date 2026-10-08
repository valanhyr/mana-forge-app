import React from 'react';
import { Ticket, TicketStatus } from '../../core/domain/ticket';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { ReplyBox } from './ReplyBox';
import { Clock, User, Shield, Lock, Layers } from 'lucide-react';

interface TicketDetailProps {
  ticket: Ticket;
  onAddMessage: (content: string, isInternalNote: boolean) => void;
  onUpdateStatus: (status: TicketStatus) => void;
  onAssignOperator?: (operatorId: string, operatorName: string) => void;
  onInspectUser?: (userId: string) => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  onAddMessage,
  onUpdateStatus,
  onInspectUser,
}) => {
  const statusOptions: TicketStatus[] = [
    'OPEN',
    'IN_PROGRESS',
    'WAITING_USER',
    'RESOLVED',
    'CLOSED',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs text-indigo-400 font-semibold">
                {ticket.id}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="text-xs text-slate-500">• {ticket.category}</span>
            </div>
            <h2 className="text-base font-semibold text-slate-100">
              {ticket.subject}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Status:</label>
            <select
              value={ticket.status}
              onChange={(e) => onUpdateStatus(e.target.value as TicketStatus)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onInspectUser?.(ticket.userId)}
              className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors group"
            >
              <User className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
              <span className="font-medium text-slate-300 group-hover:text-indigo-300">
                {ticket.userName}
              </span>
              <span className="text-slate-500">({ticket.userEmail})</span>
            </button>
            {ticket.metadata?.deckTitle && (
              <div className="flex items-center gap-1.5 text-slate-400 border-l border-slate-800 pl-3">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Deck: {ticket.metadata.deckTitle}</span>
                {ticket.metadata.format && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    {ticket.metadata.format}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
        {ticket.messages.map((msg) => {
          const isOperator = msg.sender === 'OPERATOR';
          const isNote = msg.isInternalNote;

          if (isNote) {
            return (
              <div
                key={msg.id}
                className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 my-2"
              >
                <div className="flex items-center justify-between text-xs mb-1.5 text-amber-400">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Internal Note by {msg.senderName}</span>
                  </div>
                  <span className="text-amber-500/80 text-[11px]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isOperator ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3.5 text-sm ${
                  isOperator
                    ? 'bg-indigo-600/90 text-white rounded-tr-none'
                    : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-xs opacity-75 mb-1 pb-1 border-b border-white/10">
                  <span className="font-semibold flex items-center gap-1">
                    {isOperator ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {msg.senderName}
                  </span>
                  <span className="text-[10px]">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply composer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <ReplyBox onSendMessage={onAddMessage} />
      </div>
    </div>
  );
};
