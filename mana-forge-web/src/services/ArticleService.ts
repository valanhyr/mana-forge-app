import { api } from "./api";
import { type Article } from "../core/models/Article";

// Variable local para caché en memoria (Singleton del módulo)
let cachedArticles: Article[] | null = null;

export const ArticleService = {
  getLastArticles: async (): Promise<Article[]> => {
    // Si ya tenemos datos en memoria, los devolvemos sin llamar a la API
    if (cachedArticles) {
      return cachedArticles;
    }

    try {
      const response = await api.get<Article[]>("/articles/latest");
      const data = response.data;
      cachedArticles = data; // Guardamos en caché
      return data;
    } catch (error) {
      console.error("ArticleService error:", error);
      return []; // Retornamos array vacío en caso de error para no romper la UI
    }
  },
  getArticle: async (documentId: string, locale: string): Promise<Article | null> => {
    if (!documentId) return null;

    try {
      const response = await api.get<Article>(`/articles/${documentId}?locale=${locale}`);
      const data = response.data;
      return data;
    } catch (error) {
      console.error("ArticleService error:", error);
      return null; // Retornamos null en caso de error para que la UI muestre "no encontrado"
    }
  },

  // Método por si necesitamos forzar la recarga en el futuro
  clearCache: () => {
    cachedArticles = null;
  }
}