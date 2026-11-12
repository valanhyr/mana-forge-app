import { Layers, Shield } from 'lucide-react';
import type { DeckBoard, DeckCard } from '../../core/models/Deck';
import { TYPE_ORDER } from '../../utils/deck/cardTypes';
import { useTranslation } from '../../hooks/useTranslation';
import SpoilerCard, { type MoveTarget } from './SpoilerCard';

const GRID = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';

const ORANGE = 'hover:text-orange-400';
const YELLOW = 'hover:text-yellow-400';

const MAIN_TARGETS: MoveTarget[] = [
  { board: 'side', label: '+ SIDE', hoverClass: ORANGE },
  { board: 'maybe', label: '+ MAYBE', hoverClass: YELLOW },
];

const SIDE_TARGETS: MoveTarget[] = [
  { board: 'main', label: '+ MAIN', hoverClass: ORANGE },
  { board: 'maybe', label: '+ MAYBE', hoverClass: YELLOW },
];

interface SpoilerViewProps {
  mainGroups: Record<string, DeckCard[]>;
  sideCards: DeckCard[];
  mainCount: number;
  sideCount: number;
  onQuantity: (card: DeckCard, delta: number) => void;
  onRemove: (card: DeckCard) => void;
  onMove: (card: DeckCard, board: DeckBoard) => void;
}

const SpoilerView = ({
  mainGroups,
  sideCards,
  mainCount,
  sideCount,
  onQuantity,
  onRemove,
  onMove,
}: SpoilerViewProps) => {
  const { t } = useTranslation();
  const handlers = { onQuantity, onRemove, onMove };
  const groupNames = [...TYPE_ORDER.filter((name) => mainGroups[name])] as string[];
  if (mainGroups['All']) groupNames.push('All');

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Layers size={22} className="text-orange-500" />
          {t('common.mainDeck')}
          <span className="text-zinc-500 font-normal text-sm">({mainCount})</span>
        </h2>

        {groupNames.map((typeName) => (
          <div key={typeName} className={typeName !== 'All' ? 'mb-8 ' : ''}>
            {typeName !== 'All' && (
              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-4 pb-1 border-b border-zinc-800 flex justify-between">
                <span>
                  <span className="text-orange-500">
                    {t(`deckViewer.cardTypes.${typeName}`) || typeName}
                  </span>
                  <span className="text-zinc-600 font-normal ml-2 text-xs">
                    ({mainGroups[typeName].reduce((s, c) => s + c.quantity, 0)})
                  </span>
                </span>
              </h3>
            )}
            <div className={GRID}>
              {mainGroups[typeName].map((card, i) => (
                <SpoilerCard
                  key={i}
                  card={card}
                  placeholderIcon={<Layers size={32} className="text-zinc-700 mb-2" />}
                  moveTargets={MAIN_TARGETS}
                  {...handlers}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {sideCards.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Shield size={22} className="text-zinc-500" />
            {t('common.sideboard')}
            <span className="text-zinc-500 font-normal text-sm">({sideCount})</span>
          </h2>
          <div className={`${GRID} font-mono`}>
            {sideCards.map((card, i) => (
              <SpoilerCard
                key={i}
                card={card}
                placeholderIcon={<Shield size={32} className="text-zinc-700 mb-2" />}
                moveTargets={SIDE_TARGETS}
                {...handlers}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpoilerView;
