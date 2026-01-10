import { api } from "./api";
import { type Format } from "../core/models/Format";

// Variable local para caché en memoria (Singleton del módulo)
let cachedFormats: Format[] | null = null;

export const FormatService = {
  getActiveFormats: async (): Promise<Format[]> => {
    // Si ya tenemos datos en memoria, los devolvemos sin llamar a la API
    if (cachedFormats) {
      return cachedFormats;
    }

    try {
      const response = await api.get<Format[]>("/formats/active");
      const data = response.data;
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
