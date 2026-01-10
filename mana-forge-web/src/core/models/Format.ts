export interface FormatConfig {
  minMainDeck: number;
  maxMainDeck?: number;
  maxSideboard: number;
  maxCopies: number;
}

export interface Format {
  id: string;
  name: Record<string, string>; // Mapa de idiomas ej: { en: "Standard", es: "Estándar" }
  scryfallKey: string;
  config: FormatConfig;
  isActive: boolean;
}
