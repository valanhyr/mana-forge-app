import React from 'react';
import { User360 } from '../../core/domain/user';
import { QuotaMeter } from './QuotaMeter';
import { DeckMiniList } from './DeckMiniList';
import {
  User,
  Mail,
  Calendar,
  AlertTriangle,
  Ban,
  CheckCircle,
} from 'lucide-react';

interface User360ViewProps {
  user: User360;
  onResetQuota: (userId: string) => void;
  onUpdateStatus: (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => void;
}

export const User360View: React.FC<User360ViewProps> = ({
  user,
  onResetQuota,
  onUpdateStatus,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full">
      {/* Header Profile */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 to-indigo-500 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-500/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">{user.username}</h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {user.tier}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${
                    user.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {user.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  {user.id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.status === 'ACTIVE' ? (
              <button
                onClick={() => onUpdateStatus(user.id, 'BANNED')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Ban User</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus(user.id, 'ACTIVE')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Activate User</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] text-slate-500 font-medium">Account Created</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] text-slate-500 font-medium">Last Login</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {new Date(user.lastLoginAt).toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] text-slate-500 font-medium">Total Decks</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">
              {user.stats.totalDecks}
            </div>
          </div>
          <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
            <div className="text-[10px] text-slate-500 font-medium">Failed Imports</div>
            <div className="text-xs font-semibold text-slate-200 mt-0.5 flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {user.stats.failedImportsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Body: AI Quota & Decks */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Resource Quotas
          </h3>
          <QuotaMeter
            used={user.stats.aiQueriesThisMonth}
            limit={user.stats.aiQuotaLimit}
            onReset={() => onResetQuota(user.id)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recent Decks ({user.recentDecks.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Premodern Analysis Ready
            </span>
          </div>
          <DeckMiniList decks={user.recentDecks} />
        </div>
      </div>
    </div>
  );
};
