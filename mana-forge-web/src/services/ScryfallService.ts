export const ScryfallService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCardByName: async (name: string): Promise<any> => {
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
    return response.json();
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getCardById: async (scryfallId: string): Promise<any> => {
    const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    if (!response.ok) {
      console.warn(`Card not found on Scryfall: ${scryfallId}`);
      return null;
    }
    return response.json();
  },
};
