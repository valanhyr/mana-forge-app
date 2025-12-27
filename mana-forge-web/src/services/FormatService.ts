import { type Format } from "../core/models/Format";

const API_URL = "http://localhost:8080/api";

// Variable local para caché en memoria (Singleton del módulo)
let cachedFormats: Format[] | null = null;

export const FormatService = {
  getActiveFormats: async (): Promise<Format[]> => {
    // Si ya tenemos datos en memoria, los devolvemos sin llamar a la API
    if (cachedFormats) {
      return cachedFormats;
    }

    try {
      const response = await fetch(`${API_URL}/formats/active`);
      if (!response.ok) {
        throw new Error("Error al obtener los formatos");
      }
      const data = await response.json();
      cachedFormats = data; // Guardamos en caché
      return data;
    } catch (error) {
      console.error("FormatService error:", error);
      return []; // Retornamos array vacío en caso de error para no romper la UI
    }
  },

  // Método por si necesitamos forzar la recarga en el futuro
  clearCache: () => {
    cachedFormats = null;
  },
};
