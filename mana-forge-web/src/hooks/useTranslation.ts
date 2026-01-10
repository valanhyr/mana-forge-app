// src/hooks/useTranslation.ts
import labels from "../labels.json";
import { useLanguage } from "../services/LanguageContext";

// En una app real, el locale vendría de un Contexto (UserContext) o de la URL
export const useTranslation = () => {
  const { locale } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>) => {
    // 1. Seleccionamos la raíz del idioma
    let value: any = (labels as any)[locale];

    // 2. Navegamos por las claves (ej: "dashboard.title")
    const keys = key.split(".");
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k as keyof typeof value];
      } else {
        console.warn(
          `Translation missing for key: ${key} in locale: ${locale}`
        );
        return key;
      }
    }

    if (typeof value !== "string") return key;

    // 3. Interpolamos parámetros si existen (ej: "Hola {name}")
    if (params) {
      return Object.entries(params).reduce((acc, [k, v]) => {
        return acc.replace(new RegExp(`{${k}}`, "g"), String(v));
      }, value);
    }

    return value;
  };

  return { t, locale };
};
