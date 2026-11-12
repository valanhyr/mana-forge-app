import { Lightbulb, X } from 'lucide-react';
import type { DeckBoard, DeckCard } from '../../core/models/Deck';
import { useTranslation } from '../../hooks/useTranslation';

interface MaybeboardListProps {
  cards: DeckCard[];
  onQuantity: (card: DeckCard, delta: number) => void;
  onMove: (card: DeckCard, board: DeckBoard) => void;
  onRemove: (card: DeckCard) => void;
}

const MaybeboardList = ({ cards, onQuantity, onMove, onRemove }: MaybeboardListProps) => {
  const { t } = useTranslation();

  return (
    <div className="mt-8 pt-6 border-t border-zinc-800">
      <h3 className="text-lg font-bold text-zinc-400 mb-4 flex items-center gap-2">
        <Lightbulb size={18} />
        {t('common.maybeboard')}
        <span className="text-zinc-600 text-sm font-normal">
          ({cards.reduce((acc, c) => acc + c.quantity, 0)})
        </span>
      </h3>

      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-zinc-900 rounded-md px-1.5 py-0.5 border border-zinc-800">
                  <button
                    onClick={() => onQuantity(card, -1)}
                    className="text-zinc-500 hover:text-white px-1"
                  >
                    -
                  </button>
                  <span className="text-sm font-mono w-4 text-center">{card.quantity}</span>
                  <button
                    onClick={() => onQuantity(card, 1)}
                    className="text-zinc-500 hover:text-white px-1"
                  >
                    +
                  </button>
                </div>
                <span className="text-zinc-300 font-medium">{card.name}</span>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onMove(card, 'main')}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
                >
                  {t('deckList.moveToMain') || 'Main'}
                </button>
                <button
                  onClick={() => onMove(card, 'side')}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700"
                >
                  {t('deckList.moveToSideboard') || 'Side'}
                </button>
                <button
                  onClick={() => onRemove(card)}
                  className="text-red-500 hover:bg-red-900/20 p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MaybeboardList;
