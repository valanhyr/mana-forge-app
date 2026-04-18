import { useMemo } from 'react';
import { type DeckCard } from './DeckList';
import { useTranslation } from '../../hooks/useTranslation';

interface DeckStatsProps {
  cards: DeckCard[];
}

const TYPE_META: Record<string, { color: string }> = {
  Creature: { color: '#22c55e' },
  Instant: { color: '#3b82f6' },
  Sorcery: { color: '#f97316' },
  Enchantment: { color: '#a855f7' },
  Artifact: { color: '#94a3b8' },
  Planeswalker: { color: '#f59e0b' },
  Land: { color: '#92400e' },
  Other: { color: '#52525b' },
};

const COLOR_META: Record<string, { bg: string; border: string; text: string; bar: string }> = {
  W: { bg: '#fef3c7', border: '#fde68a', text: '#78350f', bar: '#fbbf24' },
  U: { bg: '#3b82f6', border: '#60a5fa', text: '#fff', bar: '#3b82f6' },
  B: { bg: '#3f3f46', border: '#71717a', text: '#fff', bar: '#71717a' },
  R: { bg: '#ef4444', border: '#f87171', text: '#fff', bar: '#ef4444' },
  G: { bg: '#22c55e', border: '#4ade80', text: '#fff', bar: '#22c55e' },
};

const DeckStats: React.FC<DeckStatsProps> = ({ cards }) => {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const mainCards = cards.filter((c) => c.board === 'main' || !c.board);

    // Mana curve — non-lands only
    const spells = mainCards.filter((c) => !c.type?.toLowerCase().includes('land'));
    const curve = new Array(8).fill(0);
    let totalCmc = 0;
    let totalSpellQty = 0;

    spells.forEach((c) => {
      const idx = Math.min(Math.floor(c.cmc ?? 0), 7);
      curve[idx] += c.quantity;
      totalCmc += (c.cmc ?? 0) * c.quantity;
      totalSpellQty += c.quantity;
    });

    const avgCmc = totalSpellQty > 0 ? totalCmc / totalSpellQty : 0;
    const maxCurve = Math.max(...curve, 1);

    // Type distribution
    const typeGroups: Record<string, number> = {
      Creature: 0,
      Instant: 0,
      Sorcery: 0,
      Enchantment: 0,
      Artifact: 0,
      Planeswalker: 0,
      Land: 0,
      Other: 0,
    };
    const totalMain = mainCards.reduce((s, c) => s + c.quantity, 0);

    mainCards.forEach((c) => {
      const type = c.type ?? '';
      if (type.includes('Creature')) typeGroups.Creature += c.quantity;
      else if (type.includes('Instant')) typeGroups.Instant += c.quantity;
      else if (type.includes('Sorcery')) typeGroups.Sorcery += c.quantity;
      else if (type.includes('Enchantment')) typeGroups.Enchantment += c.quantity;
      else if (type.includes('Artifact')) typeGroups.Artifact += c.quantity;
      else if (type.includes('Planeswalker')) typeGroups.Planeswalker += c.quantity;
      else if (type.includes('Land')) typeGroups.Land += c.quantity;
      else if (c.quantity > 0) typeGroups.Other += c.quantity;
    });

    // Color distribution — count colored pips in mana cost
    const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    spells.forEach((c) => {
      const matches = (c.manaCost ?? '').match(/\{([WUBRG])\}/g) ?? [];
      matches.forEach((m) => {
        colorCounts[m[1]] += c.quantity;
      });
    });
    const totalPips = Object.values(colorCounts).reduce((s, v) => s + v, 0);

    return { curve, maxCurve, avgCmc, typeGroups, totalMain, colorCounts, totalPips };
  }, [cards]);

  if (stats.totalMain === 0) return null;

  const typesToShow = Object.entries(stats.typeGroups).filter(([, count]) => count > 0);
  const colorsToShow = Object.entries(stats.colorCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="mt-6 pt-6 border-t border-zinc-800 space-y-5">
      {/* ── Mana Curve ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            {t('deckBuilder.manaCurve')}
          </h3>
          <span className="text-xs text-zinc-500">
            {t('deckBuilder.avgCmc')}:{' '}
            <span className="text-orange-400 font-bold">{stats.avgCmc.toFixed(2)}</span>
          </span>
        </div>
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 pt-2 pb-3">
          <div className="flex items-end justify-between gap-2" style={{ height: '6rem' }}>
            {stats.curve.map((count, i) => {
              const pct = (count / stats.maxCurve) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span
                    className="text-[11px] font-bold text-orange-400 leading-none"
                    style={{ visibility: count > 0 ? 'visible' : 'hidden' }}
                  >
                    {count}
                  </span>
                  <div className="w-full flex items-end" style={{ height: '72%' }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-500 ease-out"
                      style={{
                        height: `${Math.max(pct, count > 0 ? 4 : 0)}%`,
                        backgroundColor: count > 0 ? '#ea580c' : '#27272a',
                        opacity: count > 0 ? 0.85 : 0.3,
                      }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">{i === 7 ? '7+' : i}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Type Distribution + Color Distribution ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Types */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
            {t('deckBuilder.typeDistribution')}
          </h3>
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 space-y-2.5">
            {typesToShow.map(([type, count]) => {
              const pct = stats.totalMain > 0 ? (count / stats.totalMain) * 100 : 0;
              const { color } = TYPE_META[type] ?? { color: '#52525b' };
              return (
                <div key={type} className="flex items-center gap-2.5">
                  <span className="text-xs text-zinc-400 w-[72px] shrink-0">{type}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-5 text-right tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colors */}
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">
            {t('deckBuilder.colorDistribution')}
          </h3>
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4">
            {colorsToShow.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">{t('deckBuilder.colorless')}</p>
            ) : (
              <div className="space-y-2.5">
                {colorsToShow.map(([color, count]) => {
                  const meta = COLOR_META[color];
                  const pct = stats.totalPips > 0 ? (count / stats.totalPips) * 100 : 0;
                  return (
                    <div key={color} className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0"
                        style={{
                          backgroundColor: meta.bg,
                          borderColor: meta.border,
                          color: meta.text,
                        }}
                      >
                        {color}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: meta.bar }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 w-7 text-right tabular-nums">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckStats;
