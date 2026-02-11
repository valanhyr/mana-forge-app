import { useCallback } from "react";
import labels from "../labels.json";
import { useLanguage } from "../services/LanguageContext";

export const useTranslation = () => {
  const { locale } = useLanguage();

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value: any = (labels as any)[locale] || (labels as any)["es"]; // Fallback a español

      const keys = key.split(".");
      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          return key; // Clave no encontrada
        }
      }

      if (typeof value !== "string") return key;

      if (params) {
        return Object.entries(params).reduce((acc, [k, v]) => {
          return acc.replace(new RegExp(`{${k}}`, "g"), String(v));
        }, value);
      }

      return value;
    },
    [locale],
  ); // Solo se recrea si cambia el idioma

  return { t, locale };
};
