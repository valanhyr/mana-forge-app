import React from 'react';
import { Search, ShieldAlert, UserCheck } from 'lucide-react';

interface HeaderProps {
  onOpenOmnibox: () => void;
  operatorName?: string;
  onResetFactoryData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenOmnibox,
  operatorName = 'Jace Beleren (Staff)',
  onResetFactoryData,
}) => {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenOmnibox}
          className="flex items-center gap-3 px-3 py-1.5 bg-slate-950/70 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 text-sm transition-all w-64 md:w-80 group"
          title="Search anything (Cmd+K)"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
          <span className="text-xs text-slate-400">Search users, tickets...</span>
          <kbd className="ml-auto text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </button>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          MOCK MODE
        </span>
      </div>

      <div className="flex items-center gap-4">
        {onResetFactoryData && (
          <button
            onClick={onResetFactoryData}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2.5 py-1 rounded border border-slate-800 hover:border-rose-500/30"
          >
            Reset Seeds
          </button>
        )}

        <div className="flex items-center gap-2.5 pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center text-indigo-200">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-200">{operatorName}</div>
            <div className="text-[10px] text-slate-400">Support Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
};
