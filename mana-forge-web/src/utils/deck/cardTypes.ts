export const TYPE_ORDER: string[] = [
  'Commander',
  'Planeswalker',
  'Creature',
  'Battle',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Land',
  'Other',
];

export type SortMode = 'cmc' | 'alpha';
export type SortDir = 'asc' | 'desc';

export interface TypeInfo {
  typeLine?: string;
  isCommander: boolean;
}

export const sortCards = <T extends { name?: string; cmc?: number }>(
  cards: T[],
  mode: SortMode,
  dir: SortDir
): T[] => {
  const mul = dir === 'asc' ? 1 : -1;
  const sorted = [...cards];
  if (mode === 'alpha') {
    return sorted.sort((a, b) => mul * (a.name ?? '').localeCompare(b.name ?? ''));
  }
  return sorted.sort((a, b) => mul * ((a.cmc ?? 0) - (b.cmc ?? 0)));
};

const MAIN_TYPES = [
  'Creature',
  'Planeswalker',
  'Battle',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Land',
] as const;

export const groupByType = <T>(
  cards: T[],
  read: (card: T) => TypeInfo
): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  for (const card of cards) {
    const { typeLine, isCommander } = read(card);
    let type: string = 'Other';
    if (isCommander) {
      type = 'Commander';
    } else {
      const mainType = (typeLine ?? '').split('—')[0];
      type = MAIN_TYPES.find((t) => mainType.includes(t)) ?? 'Other';
    }
    (groups[type] ??= []).push(card);
  }
  return groups;
};
