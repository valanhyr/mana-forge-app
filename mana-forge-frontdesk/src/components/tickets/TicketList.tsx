import React from 'react';
import { Ticket } from '../../core/domain/ticket';
import { StatusBadge } from '../ui/StatusBadge';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Clock } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId?: string;
  onSelectTicket: (ticket: Ticket) => void;
  isLoading?: boolean;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-900/50 border border-slate-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        No tickets match the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto">
      {tickets.map((ticket) => {
        const isSelected = ticket.id === selectedTicketId;
        const lastMessage = ticket.messages[ticket.messages.length - 1];

        return (
          <div
            key={ticket.id}
            onClick={() => onSelectTicket(ticket)}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              isSelected
                ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-xs text-indigo-400 font-semibold">
                {ticket.id}
              </span>
              <div className="flex items-center gap-1.5">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-1">
              {ticket.subject}
            </h3>

            {lastMessage && (
              <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                <span className="text-slate-500">{lastMessage.senderName}:</span>{' '}
                {lastMessage.content}
              </p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
              <span className="font-medium text-slate-400">{ticket.userName}</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
