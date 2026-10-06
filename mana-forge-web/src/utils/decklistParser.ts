/**
 * Decklist parsing — pure, framework-free logic for turning a pasted decklists
 * into the structured payload the AI engine expects.
 *
 * This is the same behaviour DeckBuilder's import flow has always had; it was
 * extracted here so the homepage "try analysis" section can reuse it without
 * duplicating the parsing rules.
 *
 * Engine contract (mana-forge-engine/schemas/deck_schemas.py):
 *   { main_deck: [{ name, quantity }], sideboard: [...], format_name, locale }
 */

import {
  findInBatch,
  normalizeCardName,
  safeString,
  type BatchLookup,
} from './scryfallHelpers';

/** Headers that mark the start of the sideboard section. */
const SIDEBOARD_HEADERS = new Set([
  'sideboard',
  'side board',
  'sb',
  'side',
  'accesorio',
  'bando',
  'bancho',
  'sideboard ',
]);

/** Headers that mark the start of a maybeboard / wishlist section. */
const MAYBEBOARD_HEADERS = new Set([
  'maybeboard',
  'maybe board',
  'maybes',
  'wishes',
  'wishlist',
]);

export type DeckBoard = 'main' | 'side' | 'maybe';

export interface ParsedCardLine {
  quantity: number;
  name: string;
  board: DeckBoard;
}

export interface ParseDecklistResult {
  lines: ParsedCardLine[];
  /** Lines whose card name could not be resolved against Scryfall. */
  unresolved: string[];
}

/**
 * Splits a pasted decklists into individual entries.
 *
 * Accepted shapes per line:
 *   "4 Lightning Bolt"      → 4 × Lightning Bolt (main)
 *   "Lightning Bolt"        → 1 × Lightning Bolt (main)
 *   "SB: 2 Duress"          → sideboard (inline prefix)
 *   "// Sideboard"          → sideboard from this point on
 *   "4 {2}{U}{U} Lotus"     → mana symbols are stripped from the name
 */
export const parseDecklist = (text: string): ParsedCardLine[] => {
  const lines: ParsedCardLine[] = [];
  let board: DeckBoard = 'main';

  for (const rawLine of text.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Section headers, tolerating decoration like "// Sideboard" or "== SB =="
    const cleaned = trimmed
      .replace(/^[/=*#\-\s]+/, '')
      .replace(/[/=*#\-\s]+$/, '')
      .toLowerCase()
      .trim();

    if (cleaned) {
      if (SIDEBOARD_HEADERS.has(cleaned) || cleaned.startsWith('sideboard')) {
        board = 'side';
        continue;
      }
      if (MAYBEBOARD_HEADERS.has(cleaned) || cleaned.startsWith('maybeboard')) {
        board = 'maybe';
        continue;
      }
    }

    const parsed = parseCardLine(trimmed);
    if (parsed) {
      // An inline "SB:"/"MD:" prefix overrides the current section.
      lines.push({ ...parsed, board: parsed.board ?? board });
    }
  }

  return lines;
};

/**
 * Parses a single "4 Card Name" style line.
 * Returns null when the line carries no usable card name.
 * `board` is set only when the line declares its own zone inline.
 */
const parseCardLine = (
  line: string
): { quantity: number; name: string; board: DeckBoard | null } | null => {
  let working = line;
  let inlineBoard: DeckBoard | null = null;

  // Inline board prefixes: "SB: 2 Duress", "MD 4 Bolt", "Maybeboard: 1 Wish"
  const inline = working.match(/^(sb|md|main|side|maybe(board)?)\s*[:-]\s*(.+)$/i);
  if (inline) {
    const marker = inline[1].toLowerCase();
    if (marker === 'sb' || marker === 'side') inlineBoard = 'side';
    else if (marker === 'maybe' || marker === 'maybeboard') inlineBoard = 'maybe';
    else if (marker === 'md' || marker === 'main') inlineBoard = 'main';
    working = inline[3];
  }

  // Strip a leading comment marker used by many exporters.
  working = working.replace(/^\/\/\s*/, '').trim();

  const match = working.match(/^(\d+)\s+(.+)$/);
  const quantity = match ? parseInt(match[1], 10) : 1;
  const rawName = match ? match[2] : working;

  const name = cleanCardName(rawName);
  if (!name) return null;

  return { quantity: Math.max(1, quantity), name, board: inlineBoard };
};

/**
 * Cleans a raw card name: strips mana symbols, set codes, annotations and
 * surrounding quotes so Scryfall lookups have a chance to succeed.
 */
export const cleanCardName = (raw: string): string => {
  let name = raw.trim();

  // Leading comment marker used by some exporters: "// Duress"
  name = name.replace(/^\/\/\s*/, '');

  // Mana symbols: "{2}{U}{U} Lotus Petal". Only brace groups are stripped —
  // bare colour letters are too ambiguous ("Bolt", "Lotus", "Wrath" all start
  // with a colour letter) and would corrupt real card names.
  name = name.replace(/^(?:\{[^}]*\}\s*)+/, '');

  // A stray leading count that survived the quantity parse: "4 Bolt"
  name = name.replace(/^\d+\s+/, '');

  // Split-card separator: "Fire // Ice" → "Fire / Ice"
  name = name.replace(/\s*\/\/\s*/g, ' / ');

  // Trailing set codes and print annotations, in any order:
  // "Cyclonic Rift (M21) 123", "Black Lotus ★", "Ninja #12"
  name = name.replace(/(\s*\([^)]*\)|\s+\d{1,4}|\s*[★☆✦]|\s*#\d+)+\s*$/, '');

  // Wrapping quotes
  name = name.replace(/^[!"']+|[!"']+$/g, '');

  return name.replace(/\s+/g, ' ').trim();
};

/**
 * Resolves parsed lines against a Scryfall batch lookup, producing the payload
 * the AI engine expects. Lines that cannot be resolved are reported back so
 * the UI can tell the user which cards were not found.
 */
export const buildAnalysisPayload = (
  lines: ParsedCardLine[],
  batch: BatchLookup | null | undefined,
  options: {
    formatName: string;
    locale: string;
    metaArchetypes?: string[];
  }
): { payload: Record<string, unknown>; unresolved: string[] } => {
  const main: Array<{ name: string; quantity: number }> = [];
  const side: Array<{ name: string; quantity: number }> = [];
  const maybe: Array<{ name: string; quantity: number }> = [];
  const unresolved: string[] = [];

  for (const line of lines) {
    const card = findInBatch(batch, line.name);

    // Even when Scryfall has no match we forward the user's own text: the model
    // can usually infer the card from context, and the engine sanitises the
    // name server-side anyway. Only the canonical spelling is lost.
    const canonicalName = card ? safeString(card, 'name') || line.name : line.name;
    if (!card) unresolved.push(line.name);

    const entry = { name: canonicalName, quantity: line.quantity };
    if (line.board === 'side') side.push(entry);
    else if (line.board === 'maybe') maybe.push(entry);
    else main.push(entry);
  }

  const payload: Record<string, unknown> = {
    main_deck: main,
    sideboard: side,
    format_name: options.formatName,
    locale: options.locale,
  };

  if (maybe.length > 0) payload.maybeboard = maybe;
  if (options.metaArchetypes && options.metaArchetypes.length > 0) {
    payload.meta_archetypes = options.metaArchetypes;
  }

  return { payload, unresolved };
};

/** Counts total cards per zone — used for the "deck looks too small" warning. */
export const countCards = (lines: ParsedCardLine[]) => {
  let main = 0;
  let side = 0;
  let maybe = 0;

  for (const line of lines) {
    if (line.board === 'side') side += line.quantity;
    else if (line.board === 'maybe') maybe += line.quantity;
    else main += line.quantity;
  }

  return { main, side, maybe, total: main + side + maybe };
};

/** Strips control characters that break the AI prompt or the Scryfall query. */
export const sanitizeDecklistText = (text: string): string =>
  text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\r\n?/g, '\n');

export { normalizeCardName };