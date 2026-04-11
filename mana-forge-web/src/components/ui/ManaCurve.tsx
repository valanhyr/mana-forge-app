interface CurveEntry {
  cmc?: number | null;
  quantity: number;
}

interface ManaCurveProps {
  cards: CurveEntry[];
}

const BUCKETS = [0, 1, 2, 3, 4, 5, 6];
const BUCKET_LABEL = ['0', '1', '2', '3', '4', '5', '6+'];

interface ManaCurveProps {
  cards: CurveEntry[];
  className?: string;
}

const ManaCurve = ({ cards, className = '' }: ManaCurveProps) => {
  const counts = BUCKETS.map((cmc) => {
    const bucket =
      cmc === 6
        ? cards.filter((c) => (c.cmc ?? 0) >= 6)
        : cards.filter((c) => Math.floor(c.cmc ?? 0) === cmc);
    return bucket.reduce((s, c) => s + c.quantity, 0);
  });

  const max = Math.max(...counts, 1);

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
        Mana Curve
      </p>
      <div className="flex items-end gap-1.5 flex-1 min-h-0">
        {counts.map((count, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
            {count > 0 && (
              <span className="text-[10px] text-zinc-400 font-mono leading-none">{count}</span>
            )}
            <div
              className="w-full rounded-t bg-orange-500/80 hover:bg-orange-400 transition-colors"
              style={{ height: `${Math.max((count / max) * 100, count > 0 ? 4 : 0)}%` }}
              title={`CMC ${BUCKET_LABEL[i]}: ${count} cards`}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1 shrink-0">
        {BUCKET_LABEL.map((label, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-zinc-600 font-mono">
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManaCurve;
