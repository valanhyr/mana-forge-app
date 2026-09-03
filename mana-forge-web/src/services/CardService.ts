/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_URL, api } from './api';

export const CardService = {
  autocomplete: async (query: string): Promise<string[]> => {
    if (query.length < 3) return [];

    try {
      const response = await fetch(`${API_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`);
      if (!response.ok) return [];
      const json: Record<string, any> = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  },

  getCardByName: async (name: string): Promise<Record<string, any>> => {
    try {
      const exactQuery = `!"${name}"`;
      const exactResponse = await fetch(
        `${API_URL}/cards/scryfall?q=${encodeURIComponent(exactQuery)}`
      );

      if (exactResponse.ok) {
        const exactResult: Record<string, any> = await exactResponse.json();
        if (exactResult.data && exactResult.data.length > 0) {
          return exactResult.data[0];
        }
      }

      // 2. Si falla (ej. nombres en español "Bosque"), intentar búsqueda general
      const response = await fetch(`${API_URL}/cards/scryfall?q=${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error('Card not found');

      const result: Record<string, any> = await response.json();

      // El endpoint de búsqueda devuelve una lista, tomamos el primer resultado.
      if (result.data && result.data.length > 0) {
        return result.data[0];
      } else {
        throw new Error(`Card not found: ${name}`);
      }
    } catch (error) {
      console.error('GetCardByName error:', error);
      throw error;
    }
  },

  getCardById: async (id: string): Promise<Record<string, any>> => {
    try {
      const response = await fetch(`${API_URL}/cards/scryfall/${id}`);
      if (!response.ok) throw new Error('Card not found');
      return await response.json();
    } catch (error) {
      console.error('GetCardById error:', error);
      throw error;
    }
  },

  /**
   * Obtiene la lista de cartas prohibidas según el formato de juego.
   * @param {string} format - El formato de cartas (ej: 'standard', 'modern', 'commander').
   * @returns {Promise<Card[]>} Una promesa que resuelve a un array de objetos tipo Card.
   * @throws {Error} Si la respuesta de la red no es exitosa o la carta no existe.
   */
  getBannedcards: async (format: string): Promise<Record<string, any>> => {
    try {
      const response = await fetch(`${API_URL}/cards/banned/${format}`);
      if (!response.ok) throw new Error('Card not found');
      return await response.json();
    } catch (error) {
      console.error('GetCardById error:', error);
      throw error;
    }
  },

  // Fetch available prints/images by oracleId via backend
  getPrintsByOracleId: async (cardId: string, oracleId?: string): Promise<Record<string, any>> => {
    try {
      // If oracleId not provided, fetch card to obtain it
      let oid = oracleId;
      if (!oid) {
        const card = await CardService.getCardById(cardId);
        oid = card.oracle_id;
      }
      const response = await fetch(`${API_URL}/cards/${cardId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oracleId: oid }),
      });
      if (!response.ok) throw new Error('Failed to fetch prints');
      return await response.json();
    } catch (error) {
      console.error('getPrintsByOracleId error:', error);
      throw error;
    }
  },

  // Batch search via backend endpoint
  batchSearch: async (queries: string[]): Promise<Record<string, Record<string, any>>> => {
    try {
      const resp = await api.post('/cards/scryfall/batch', queries);
      const results: any[] = resp.data?.results || [];
      // Normalize into a lookup map by several possible keys the frontend may use
      const map: Record<string, Record<string, any>> = {};
      for (const item of results) {
        const line = item.line;
        const name = item.name;
        if (line) map[line] = item;
        if (name) map[name] = item;
        // also support quoted exact query variant used in code: !"Name"
        if (name) map[`!"${name}"`] = item;
        // normalized lower-case name
        if (name) map[name.toLowerCase()] = item;
      }
      return map;
    } catch (error) {
      console.error('batchSearch error:', error);
      throw error;
    }
  },

};
