export const ARCHETYPES_DB: Record<string, string[]> = {
  premodern: [
    'Burn',
    'Stiflenought',
    'Goblins',
    'Oath',
    'Parallax Replenish',
    'Enchantress',
    'Elves',
    'Devourer Combo',
    'Landstill',
    'Tide Control',
    'Madness',
    'Survival',
    'Terrageddon',
    'Stasis',
    'Reanimator',
  ],
  legacy: [
    'Izzet Delver',
    'Reanimator',
    'Red Prison',
    'Lands',
    'Doomsday',
    'Death and Taxes',
    'Sneak and Show',
    'Storm',
    'Control',
    'Elves',
  ],
};

export const archetypesForFormat = (scryfallKey: string | undefined): string[] => {
  const key = (scryfallKey || '').toLowerCase();
  const found = Object.keys(ARCHETYPES_DB).find((k) => key.includes(k));
  return found ? ARCHETYPES_DB[found] : [];
};
