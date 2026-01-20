const API_URL = "http://localhost:8080/api";

export const CardService = {
  autocomplete: async (query: string): Promise<string[]> => {
    if (query.length < 3) return [];

    try {
      const response = await fetch(
        `${API_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) return [];
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error("Autocomplete error:", error);
      return [];
    }
  },

  getCardByName: async (name: string): Promise<any> => {
    try {
      const exactQuery = `!"${name}"`;
      const exactResponse = await fetch(
        `${API_URL}/cards/scryfall?q=${encodeURIComponent(exactQuery)}`
      );

      if (exactResponse.ok) {
        const exactResult = await exactResponse.json();
        if (exactResult.data && exactResult.data.length > 0) {
          return exactResult.data[0];
        }
      }

      // 2. Si falla (ej. nombres en español "Bosque"), intentar búsqueda general
      const response = await fetch(
        `${API_URL}/cards/scryfall?q=${encodeURIComponent(name)}`
      );
      if (!response.ok) throw new Error("Card not found");

      const result = await response.json();

      // El endpoint de búsqueda devuelve una lista, tomamos el primer resultado.
      if (result.data && result.data.length > 0) {
        return result.data[0];
      } else {
        throw new Error(`Card not found: ${name}`);
      }
    } catch (error) {
      console.error("GetCardByName error:", error);
      throw error;
    }
  },

  getCardById: async (id: string): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/cards/scryfall/${id}`);
      if (!response.ok) throw new Error("Card not found");
      return await response.json();
    } catch (error) {
      console.error("GetCardById error:", error);
      throw error;
    }
  },
  
 /**
 * Obtiene la lista de cartas prohibidas según el formato de juego.
 * @param {string} format - El formato de cartas (ej: 'standard', 'modern', 'commander').
 * @returns {Promise<Card[]>} Una promesa que resuelve a un array de objetos tipo Card.
 * @throws {Error} Si la respuesta de la red no es exitosa o la carta no existe.
 */
  getBannedcards: async (format: string): Promise<any> => {
    try {
      const response = await fetch(`${API_URL}/cards/banned/${format}`);
      if (!response.ok) throw new Error("Card not found");
      return await response.json();
    } catch (error) {
      console.error("GetCardById error:", error);
      throw error;
    }
  }
};
