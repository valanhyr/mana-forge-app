/**
 * Helpers to safely extract fields from unknown-shaped Scryfall responses.
 * Scryfall payloads differ across endpoints ({ data: [...] }, { card: {...} },
 * direct card objects), so every read is defensive.
 */

export const safeString = (
  obj: Record<string, unknown> | null | undefined,
  key: string,
  fallback = ''
): string => {
  if (!obj) return fallback;
  const v = obj[key];
  return typeof v === 'string' ? v : fallback;
};

export const safeNumber = (
  obj: Record<string, unknown> | null | undefined,
  key: string,
  fallback = 0
): number => {
  if (!obj) return fallback;
  const v = obj[key];
  return typeof v === 'number' ? v : fallback;
};

export const safeNested = (
  obj: Record<string, unknown> | null | undefined,
  path: string[],
  fallback: unknown = undefined
): unknown => {
  if (!obj) return fallback;
  let cur: unknown = obj;
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return fallback;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur === undefined ? fallback : cur;
};

/**
 * A lookup map from card name variants to raw Scryfall entries, as returned by
 * `CardService.batchSearch`. Values are `unknown` because Scryfall payloads
 * differ per endpoint and must be read defensively.
 */
export type BatchLookup = Record<string, Record<string, unknown>>;

/** Normalizes a card name for fuzzy comparison: trimmed, lowercased, unquoted. */
export const normalizeCardName = (s: string): string =>
  s.trim().toLowerCase().replace(/["']/g, '');

/**
 * Unwraps a card from any of the shapes the batch endpoint may return:
 * `{ data: [...] }`, `{ card: {...} }`, or the card object directly.
 * Returns null when nothing usable is present.
 */
export const unwrapCard = (
  result: Record<string, unknown> | null | undefined
): Record<string, unknown> | null => {
  if (!result) return null;
  if (Array.isArray(result.data) && result.data.length > 0) {
    return result.data[0] as Record<string, unknown>;
  }
  if (result.card) return result.card as Record<string, unknown>;
  if (result.id && result.name) return result;
  return null;
};

/**
 * Looks a card up in a batchSearch lookup map. Tries exact keys first, then
 * falls back to normalized / prefix matching so that pasted lists with set
 * codes or odd casing still resolve.
 */
export const findInBatch = (
  batch: BatchLookup | null | undefined,
  cardName: string
): Record<string, unknown> | null => {
  if (!batch) return null;

  const direct =
    batch[cardName] || batch[`!"${cardName}"`] || batch[cardName.toLowerCase()];
  const unwrappedDirect = unwrapCard(direct);
  if (unwrappedDirect) return unwrappedDirect;

  const target = normalizeCardName(cardName);
  for (const value of Object.values(batch)) {
    if (!value) continue;
    const inner = value as {
      name?: unknown;
      line?: unknown;
      card?: { name?: unknown };
      data?: Array<{ name?: unknown }>;
    };
    const candidateName = (
      inner.name ??
      inner.card?.name ??
      (Array.isArray(inner.data) ? inner.data[0]?.name : undefined) ??
      inner.line ??
      ''
    )
      .toString()
      .trim();

    if (!candidateName) continue;
    const normalized = normalizeCardName(candidateName);

    if (normalized === target) return unwrapCard(value);
    if (normalized.startsWith(target) || target.startsWith(normalized)) {
      return unwrapCard(value);
    }
  }

  return null;
};