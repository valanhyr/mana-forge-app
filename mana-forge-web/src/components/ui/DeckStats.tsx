import { useMemo } from 'react';
import { type DeckCard } from './DeckList';
import { useTranslation } from '../../hooks/useTranslation';

interface DeckStatsProps {
  cards: DeckCard[];
}

const DeckStats: React.FC<DeckStatsProps> = ({ cards }) => {
  const { t } = useTranslation();
  const stats = useMemo(() => {
    // Filtramos solo cartas del mazo principal y que no sean tierras
    const mainDeckSpells = cards.filter(
      (c) => (c.board === 'main' || !c.board) && !c.type.toLowerCase().includes('land')
    );

    const curve = new Array(8).fill(0); // Buckets para CMC 0 a 7+

    mainDeckSpells.forEach((card) => {
      const cmc = card.cmc || 0;
      const index = Math.min(Math.floor(cmc), 7);
      curve[index] += card.quantity;
    });

    const maxCount = Math.max(...curve, 1); // Evitar división por cero

    return {
      curve,
      maxCount,
      totalSpells: mainDeckSpells.reduce((a, c) => a + c.quantity, 0),
    };
  }, [cards]);

  if (stats.totalSpells === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-zinc-800">
      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">
        {t('deckBuilder.manaCurve')}
      </h3>
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-end justify-between h-32 gap-3">
          {stats.curve.map((count, i) => {
            const heightPercentage = (count / stats.maxCount) * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
              >
                <div className="relative w-full flex justify-center items-end h-full">
                  <div
                    className="w-full bg-orange-600/80 hover:bg-orange-500 transition-all duration-500 ease-out rounded-t-sm min-h-[4px]"
                    style={{ height: `${heightPercentage}%` }}
                  ></div>
                  {count > 0 && (
                    <span className="absolute -top-6 text-xs font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 font-medium border-t border-zinc-800 w-full text-center pt-2">
                  {i === 7 ? '7+' : i}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeckStats;
