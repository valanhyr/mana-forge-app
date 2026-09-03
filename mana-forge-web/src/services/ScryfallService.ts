export const ScryfallService = {
    getCardByName: async (name: string): Promise<Record<string, unknown> | null> => {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Card not found on Scryfall: ${name}`);
        return null;
      }
      throw new Error(`Failed to fetch card data for ${name}`);
    }
    const json = (await response.json()) as Record<string, unknown>;
    return json;
  },

    getCardById: async (scryfallId: string): Promise<Record<string, unknown> | null> => {
    const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!response.ok) {
      console.warn(`Card not found on Scryfall: ${scryfallId}`);
      return null;
    }
    const json = (await response.json()) as Record<string, unknown>;
    return json;
  },
};
