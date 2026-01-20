export interface FormatConfig {
  minMainDeck: number;
  maxMainDeck?: number;
  maxSideboard: number;
  maxCopies: number;
}

export interface Format {
  id: string;
  name: Record<string, string>;
  scryfallKey: string;
  config: FormatConfig;
  isActive: boolean;
}

export interface FormatDetail {
  mongoId: String,
  slug: string,
  title: string,
  subtitle: string,
  description: FormatSection,
  rules: FormatSection,
  imageUrl:string,
  
}
export interface FormatCMSBase {
  mongoId: String,
  title: String,
  imageUrl: String,
  description: String,
}
export interface FormatSection {
  name: string,
  title: string,
  description: string,
  rules: FormatRule[],
}
export interface FormatRule {
  id:number,
  text: string
}