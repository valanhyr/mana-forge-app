import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { DeckBoard, DeckCard } from '../../core/models/Deck';
import { useTranslation } from '../../hooks/useTranslation';

export interface MoveTarget {
  board: DeckBoard;
  label: string;
  hoverClass: string;
}

interface SpoilerCardProps {
  card: DeckCard;
  placeholderIcon: ReactNode;
  moveTargets: MoveTarget[];
  onQuantity: (card: DeckCard, delta: number) => void;
  onRemove: (card: DeckCard) => void;
  onMove: (card: DeckCard, board: DeckBoard) => void;
}

const stop = (fn: () => void) => (e: React.MouseEvent) => {
  e.stopPropagation();
  fn();
};

const SpoilerCard = ({
  card,
  placeholderIcon,
  moveTargets,
  onQuantity,
  onRemove,
  onMove,
}: SpoilerCardProps) => {
  const { t } = useTranslation();

  return (
    <div className="group relative">
      {card.image ? (
        <img
          src={card.image}
          alt={card.name}
          className={`rounded-lg shadow-lg w-full transition-transform group-hover:scale-105 group-hover:z-10 ${card.isGameChanger ? 'ring-2 ring-orange-500 shadow-orange-500/30' : ''}`}
        />
      ) : (
        <div className="aspect-[2.5/3.5] rounded-lg bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center">
          {placeholderIcon}
          <span className="text-xs text-zinc-500 font-medium">{card.name}</span>
        </div>
      )}

      {/* Desktop Hover Overlay */}
      <div className="hidden lg:block absolute top-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        ×{card.quantity}
      </div>
      <div className="hidden lg:flex absolute bottom-1 left-1/2 -translate-x-1/2 items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div className="flex bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden p-0.5">
          <button
            onClick={stop(() => onQuantity(card, -1))}
            className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            -
          </button>
          <button
            onClick={stop(() => onQuantity(card, 1))}
            className="px-2 text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            +
          </button>
          <button
            onClick={stop(() => onRemove(card))}
            className="px-2 text-red-500 hover:bg-zinc-800"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Footer estático para mobile/tablet */}
      <div className="mt-2 flex lg:hidden flex-col gap-1.5 w-full bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-950 rounded-md px-1 py-0.5 border border-zinc-800">
            <button
              onClick={stop(() => onQuantity(card, -1))}
              className="text-zinc-500 hover:text-white px-1 font-bold"
            >
              -
            </button>
            <span className="text-xs font-bold text-zinc-300 w-4 text-center">{card.quantity}</span>
            <button
              onClick={stop(() => onQuantity(card, 1))}
              className="text-zinc-500 hover:text-white px-1 font-bold"
            >
              +
            </button>
          </div>

          <button
            onClick={stop(() => onRemove(card))}
            className="text-red-500/70 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition-colors"
            title={t('common.delete')}
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-1">
          {moveTargets.map((target) => (
            <button
              key={target.board}
              onClick={stop(() => onMove(card, target.board))}
              className={`flex-1 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 hover:bg-zinc-800 ${target.hoverClass} py-1 rounded border border-zinc-800 transition-colors`}
            >
              {target.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpoilerCard;
