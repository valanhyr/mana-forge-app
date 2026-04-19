import { useTranslation } from '../../hooks/useTranslation';
import RadarChart from './RadarChart';

type ScoreEntry = { value: number; key_cards?: string[] };
type ScoreValue = number | ScoreEntry;
export type ScoreMap = Record<string, ScoreValue>;

interface DeckProfileChartProps {
  scores: ScoreMap;
  projectedScores?: ScoreMap;
  containerClassName?: string;
}

export const MOCK_SCORES: ScoreMap = {
  speed: { value: 7, key_cards: ['Goblin Piledriver', 'Goblin Warchief'] },
  consistency: { value: 6, key_cards: ['Goblin Matron', 'Goblin Lackey'] },
  aggression: { value: 8, key_cards: ['Goblin Piledriver', 'Goblin Warchief'] },
  resilience: { value: 5, key_cards: ['Goblin King'] },
  interaction: { value: 4, key_cards: ['Naturalize'] },
  combo_potential: { value: 2 },
};

const resolve = (map: ScoreMap, key: string): number => {
  const v = map[key];
  if (v === undefined) return 0;
  return typeof v === 'number' ? v : v.value;
};

const resolveCards = (map: ScoreMap, key: string): string[] => {
  const v = map[key];
  if (!v || typeof v === 'number') return [];
  return v.key_cards ?? [];
};

const DeckProfileChart: React.FC<DeckProfileChartProps> = ({
  scores,
  projectedScores,
  containerClassName = 'bg-zinc-900 border border-zinc-800 rounded-xl p-4',
}) => {
  const { t } = useTranslation();

  const DIMS = [
    { key: 'speed', label: t('deckBuilder.scoreSpeed') },
    { key: 'consistency', label: t('deckBuilder.scoreConsistency') },
    { key: 'aggression', label: t('deckBuilder.scoreAggression') },
    { key: 'resilience', label: t('deckBuilder.scoreResilience') },
    { key: 'interaction', label: t('deckBuilder.scoreInteraction') },
    { key: 'combo_potential', label: t('deckBuilder.scoreCombo') },
  ];

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-orange-500 font-bold">{t('deckBuilder.deckProfile')}</h4>
        {projectedScores && (
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
              {t('deckBuilder.scoreCurrent')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              {t('deckBuilder.scoreProjected')}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-col xl:grid xl:grid-cols-2 gap-6">
        <div className="mx-auto xl:mx-0 xl:flex xl:justify-center">
          <RadarChart
            size={260}
            axes={DIMS.map(({ key, label }) => ({
              key,
              label,
              value: resolve(scores, key),
              projectedValue: projectedScores ? resolve(projectedScores, key) : undefined,
              keyCards: resolveCards(scores, key),
            }))}
          />
        </div>
        <div className="space-y-3 text-sm w-full">
          {DIMS.map(({ key, label }) => {
            const cur = resolve(scores, key);
            const proj = projectedScores ? resolve(projectedScores, key) : undefined;
            const cards = resolveCards(scores, key);
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-zinc-400 w-24 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-500"
                      style={{ width: `${cur * 10}%` }}
                    />
                    {proj !== undefined && (
                      <div
                        className="absolute top-0 h-full rounded-full bg-green-500/50 transition-all duration-500"
                        style={{ width: `${proj * 10}%` }}
                      />
                    )}
                  </div>
                  <span className="text-orange-400 font-bold tabular-nums">
                    {cur}
                    {proj !== undefined && proj !== cur ? (
                      <span className="text-green-400"> → {proj}</span>
                    ) : null}
                  </span>
                </div>
                {cards.length > 0 && (
                  <p className="text-xs text-zinc-500 pl-[6.5rem] leading-tight">
                    {t('deckBuilder.scoreKeyCards')}: {cards.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeckProfileChart;
