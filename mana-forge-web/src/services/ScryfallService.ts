export const ScryfallService = {
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
};
