import apiClient from "../apiClient";

export const formatService = {
  getActiveFormats: async () => {
    const { data } = await apiClient.get("/formats/active");
    return data;
  },
};

export const deckService = {
  importFromText: async (deckData) => {
    // deckData = { title: 'Mono Red', rawList: '4 Lightning Bolt...', formatId: '...' }
    const { data } = await apiClient.post("/decks/import", deckData);
    return data;
  },
};
