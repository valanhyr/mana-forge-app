export interface CurveCard {
  cmc?: number | null;
  quantity: number;
  type?: string;
  typeLine?: string;
}

export interface ManaCurveResult {
  curve: number[];
  totalSpells: number;
  avgCmc: number;
  maxCount: number;
}

const isLand = (card: CurveCard): boolean =>
  (card.type ?? card.typeLine ?? '').toLowerCase().includes('land');

export const computeManaCurve = (cards: CurveCard[], lastBucket: number): ManaCurveResult => {
  const curve: number[] = new Array(lastBucket + 1).fill(0);
  let totalCmc = 0;
  let totalSpells = 0;

  for (const card of cards) {
    if (isLand(card)) continue;
    const cmc = card.cmc ?? 0;
    curve[Math.min(Math.floor(cmc), lastBucket)] += card.quantity;
    totalCmc += cmc * card.quantity;
    totalSpells += card.quantity;
  }

  return {
    curve,
    totalSpells,
    avgCmc: totalSpells > 0 ? totalCmc / totalSpells : 0,
    maxCount: Math.max(...curve, 1),
  };
};
