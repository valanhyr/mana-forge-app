import React from 'react';
import { User360 } from '../../core/domain/user';
import { Mail, Layers, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
import { useTranslation } from '../../hooks/use-translation';

interface UserCardProps {
  user: User360;
  isSelected?: boolean;
  onSelect: (user: User360) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, isSelected = false, onSelect }) => {
  const { t } = useTranslation();
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PATREON':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'PRO':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div
      onClick={() => onSelect(user)}
      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10'
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center font-bold text-sm text-indigo-200">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <span>{user.username}</span>
              {user.status === 'BANNED' && (
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              )}
              {user.status === 'ACTIVE' && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-slate-500" />
              <span>{user.email}</span>
            </div>
          </div>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getTierColor(
            user.tier
          )}`}
        >
          {user.tier}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pt-2.5 border-t border-slate-800/60">
        <div>
          <div className="text-[10px] text-slate-500">Decks</div>
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            {user.stats.totalDecks}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">AI Usage</div>
          <div className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1">
            <Cpu className="w-3 h-3 text-slate-500" />
            {(user.stats.aiQuotaPeriod === 'DAILY' ? user.stats.aiQueriesToday : user.stats.aiQueriesThisMonth) ?? t('unknown')}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500">Open Tickets</div>
          <div className="text-xs font-semibold text-slate-200">
            {user.openTicketsCount}
          </div>
        </div>
      </div>
    </div>
  );
};
