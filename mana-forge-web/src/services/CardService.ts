/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { api } from './api';

export const CardService = {
  autocomplete: async (query: string): Promise<string[]> => {
    if (query.length < 3) return [];

    try {
      const response = await api.get<Record<string, any>>('/cards/autocomplete', {
        params: { q: query },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Autocomplete error:', error);
      return [];
    }
  },

  getCardByName: async (name: string): Promise<Record<string, any>> => {
    try {
      try {
        const exact = await api.get<Record<string, any>>('/cards/scryfall', {
          params: { q: `!"${name}"` },
        });
        if (exact.data.data && exact.data.data.length > 0) {
          return exact.data.data[0];
        }
      } catch (error) {
        // An HTTP error on the exact query falls through to the general search;
        // anything else (network failure) is a real error.
        if (!axios.isAxiosError(error) || !error.response) throw error;
      }

      // 2. Si falla (ej. nombres en español "Bosque"), intentar búsqueda general
      const response = await api.get<Record<string, any>>('/cards/scryfall', {
        params: { q: name },
      });

      // El endpoint de búsqueda devuelve una lista, tomamos el primer resultado.
      if (response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      }
      throw new Error(`Card not found: ${name}`);
    } catch (error) {
      console.error('GetCardByName error:', error);
      throw error;
    }
  },

  getCardById: async (id: string): Promise<Record<string, any>> => {
    try {
      const response = await api.get<Record<string, any>>(`/cards/scryfall/${id}`);
      return response.data;
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
      const response = await api.get<Record<string, any>>(`/cards/banned/${format}`);
      return response.data;
    } catch (error) {
      console.error('GetBannedCards error:', error);
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
      const response = await api.post<Record<string, any>>(`/cards/${cardId}/images`, {
        oracleId: oid,
      });
      return response.data;
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
