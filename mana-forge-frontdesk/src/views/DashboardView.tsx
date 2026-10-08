import React from 'react';
import { useTickets } from '../hooks/use-tickets';
import { useAuditLog } from '../hooks/use-audit';
import { useUserSearch } from '../hooks/use-users';
import { Ticket } from '../core/domain/ticket';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import {
  Inbox,
  AlertTriangle,
  Users,
  Cpu,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: 'tickets' | 'users' | 'emails' | 'audit') => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onSelectTicket,
}) => {
  const { data: tickets = [] } = useTickets();
  const { data: users = [] } = useUserSearch('');
  const { data: recentAudit = [] } = useAuditLog({ limit: 5 });

  const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const urgentTickets = tickets.filter(
    (t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
  );
  const quotaExceededUsers = users.filter(
    (u) => u.stats.aiQueriesThisMonth >= u.stats.aiQuotaLimit
  );

  return (
    <div className="space-y-6 overflow-y-auto h-[calc(100vh-7rem)] pb-8 pr-1">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/50 via-slate-900 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Support & Operations Center</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome back, Jace Beleren
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Monitor Magic: The Gathering deck builder questions, analyze Premodern legality tickets, manage AI query allocations, and communicate with players.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all hover:bg-slate-850"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Tickets</span>
            <Inbox className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{openTickets.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending operator action</div>
        </div>

        <div
          onClick={() => onNavigateTab('tickets')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-rose-500/50 transition-all hover:bg-slate-850"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Urgent Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{urgentTickets.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">High/Urgent priority</div>
        </div>

        <div
          onClick={() => onNavigateTab('users')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/50 transition-all hover:bg-slate-850"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Quotas Exhausted</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{quotaExceededUsers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Users at 100% monthly limit</div>
        </div>

        <div
          onClick={() => onNavigateTab('users')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all hover:bg-slate-850"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Registered</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{users.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active MtG deck builders</div>
        </div>
      </div>

      {/* Triage Queue & Recent Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Triage list */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Inbox className="w-4 h-4 text-indigo-400" />
              <span>Priority Triage Queue</span>
            </div>
            <button
              onClick={() => onNavigateTab('tickets')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {urgentTickets.slice(0, 4).map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => {
                  onSelectTicket(ticket);
                  onNavigateTab('tickets');
                }}
                className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 cursor-pointer transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                    {ticket.subject}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {ticket.id} • {ticket.userName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Audit Snippet */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Recent Activity Feed</span>
            </div>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <span>View full log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentAudit.map((item) => (
              <div key={item.id} className="text-xs space-y-0.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-400">{item.actor.name}</span>
                  <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-300 text-xs line-clamp-1">{item.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
