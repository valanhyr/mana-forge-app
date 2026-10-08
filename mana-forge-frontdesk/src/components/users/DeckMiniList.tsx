import React from 'react';
import { UserSummaryDeck } from '../../core/domain/user';
import { Layers, Calendar } from 'lucide-react';

interface DeckMiniListProps {
  decks: UserSummaryDeck[];
}

export const DeckMiniList: React.FC<DeckMiniListProps> = ({ decks }) => {
  if (decks.length === 0) {
    return (
      <div className="text-xs text-slate-500 py-3 text-center">
        No decks built by this user yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {decks.map((deck) => (
        <div
          key={deck.id}
          className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">{deck.name}</div>
              <div className="text-[11px] text-slate-400">
                {deck.cardCount} cards • {deck.id}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-mono">
              {deck.format}
            </span>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{deck.updatedAt}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
