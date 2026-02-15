import { API_URL } from "./api";

export interface ManaSymbol {
  symbol: string;
  svg_uri: string;
  english: string;
  transposable: boolean;
  represents_mana: boolean;
  cmc?: number;
}

let symbolCache: Record<string, string> = {};
let isLoaded = false;
let loadingPromise: Promise<Record<string, string>> | null = null;

export const ManaSymbolService = {
  getAll: async (): Promise<Record<string, string>> => {
    if (isLoaded) return symbolCache;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch(`${API_URL}/cards/symbology`)
      .then((res) => res.json())
      .then((data) => {
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((s: ManaSymbol) => {
            symbolCache[s.symbol] = s.svg_uri;
          });
        }
        isLoaded = true;
        return symbolCache;
      })
      .catch((err) => {
        console.error("Error loading mana symbols:", err);
        return {};
      });

    return loadingPromise;
  },
};
