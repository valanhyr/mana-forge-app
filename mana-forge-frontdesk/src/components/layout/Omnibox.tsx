import React, { useState, useEffect } from 'react';
import { Search, X, Inbox, User } from 'lucide-react';
import { container } from '../../infrastructure/container';
import { Ticket } from '../../core/domain/ticket';
import { User360 } from '../../core/domain/user';

interface OmniboxProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTicket?: (ticket: Ticket) => void;
  onSelectUser?: (user: User360) => void;
}

export const Omnibox: React.FC<OmniboxProps> = ({
  isOpen,
  onClose,
  onSelectTicket,
  onSelectUser,
}) => {
  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User360[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via parent
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setTickets([]);
      setUsers([]);
      return;
    }

    if (!query.trim()) {
      setTickets([]);
      setUsers([]);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    Promise.all([
      container.ticketRepo.list({ query }),
      container.userRepo.search(query),
    ]).then(([ticketResults, userResults]) => {
      if (!isCancelled) {
        setTickets(ticketResults);
        setUsers(userResults);
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, tickets, decks or issues..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-4">
          {isLoading && (
            <div className="text-center py-6 text-xs text-slate-400">Searching...</div>
          )}

          {!isLoading && query && tickets.length === 0 && users.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              No matching tickets or users found for "{query}".
            </div>
          )}

          {tickets.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-indigo-400" />
                Tickets ({tickets.length})
              </div>
              <div className="space-y-1">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTicket?.(t);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-400">
                        {t.id} • {t.userName} ({t.userEmail})
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {t.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {users.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Users ({users.length})
              </div>
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser?.(u);
                      onClose();
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-200 group-hover:text-indigo-300">
                        {u.username}
                      </div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {u.tier}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
