import { describe, it, expect } from 'vitest';
import { computeManaCurve } from '../../../../utils/deck/manaCurve';

describe('computeManaCurve', () => {
  it('buckets spells by floored cmc and caps the last bucket', () => {
    const r = computeManaCurve(
      [
        { cmc: 0, quantity: 1, type: 'Artifact' },
        { cmc: 2, quantity: 4, type: 'Instant' },
        { cmc: 2.5, quantity: 1, type: 'Instant' },
        { cmc: 9, quantity: 2, type: 'Creature' },
      ],
      6
    );
    expect(r.curve).toEqual([1, 0, 5, 0, 0, 0, 2]);
    expect(r.totalSpells).toBe(8);
  });

  it('excludes lands in any case and from either type field', () => {
    const r = computeManaCurve(
      [
        { cmc: 0, quantity: 20, type: 'Basic Land' },
        { cmc: 0, quantity: 4, typeLine: 'Land — Desert' },
        { cmc: 3, quantity: 2, type: 'creature' },
      ],
      6
    );
    expect(r.curve[0]).toBe(0);
    expect(r.totalSpells).toBe(2);
  });

  it('treats missing cmc as 0 and computes the average', () => {
    const r = computeManaCurve(
      [
        { quantity: 2, type: 'Artifact' },
        { cmc: 4, quantity: 2, type: 'Creature' },
      ],
      7
    );
    expect(r.curve).toHaveLength(8);
    expect(r.curve[0]).toBe(2);
    expect(r.avgCmc).toBe(2);
  });

  it('returns zeros for an empty deck', () => {
    const r = computeManaCurve([], 6);
    expect(r).toEqual({ curve: [0, 0, 0, 0, 0, 0, 0], totalSpells: 0, avgCmc: 0, maxCount: 1 });
  });

  it('reports maxCount for scaling bars', () => {
    const r = computeManaCurve([{ cmc: 1, quantity: 3, type: 'Instant' }], 6);
    expect(r.maxCount).toBe(3);
  });
});
