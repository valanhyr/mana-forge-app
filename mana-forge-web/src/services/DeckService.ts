const API_URL = "http://localhost:8080/api";

// Esta interfaz coincide con el DeckRequestDTO en el backend
interface DeckPayload {
  name: string;
  formatId: string;
  userId: string;
  isPrivate: boolean;
  cards: {
    id: string; // scryfallId
    quantity: number;
    board: "main" | "side";
  }[];
}

export const DeckService = {
  saveDeck: async (payload: DeckPayload): Promise<any> => {
    const response = await fetch(`${API_URL}/decks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al guardar el mazo");
    }

    return await response.json();
  },

  updateDeck: async (id: string, payload: DeckPayload): Promise<any> => {
    const response = await fetch(`${API_URL}/decks/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al actualizar el mazo");
    }

    return await response.json();
  },

  getDeckById: async (id: string): Promise<any> => {
    const response = await fetch(`${API_URL}/decks/${id}`);
    if (!response.ok) {
      throw new Error("Error fetching deck");
    }
    return await response.json();
  },
};
