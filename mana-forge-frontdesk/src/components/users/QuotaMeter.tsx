import React from 'react';
import { Cpu, RotateCcw } from 'lucide-react';

interface QuotaMeterProps {
  used: number;
  limit: number;
  onReset?: () => void;
  isLoading?: boolean;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({
  used,
  limit,
  onReset,
  isLoading = false,
}) => {
  const percentage = Math.min(Math.round((used / limit) * 100), 100);

  const getBarColor = (pct: number) => {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <span>Monthly AI Quota</span>
        </div>
        <div className="text-xs font-mono font-medium text-slate-300">
          <span className={percentage >= 100 ? 'text-rose-400 font-bold' : ''}>
            {used}
          </span>
          <span className="text-slate-500"> / {limit} queries</span>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {percentage}% consumed this period
        </span>
        {onReset && (
          <button
            onClick={onReset}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Quota</span>
          </button>
        )}
      </div>
    </div>
  );
};
