import { createContext, useContext, useState, type ReactNode, useMemo } from 'react';

export type Locale = 'es' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Inicialización perezosa: lee localStorage solo una vez al inicio para evitar re-renders
  const [locale, setLocale] = useState<Locale>(() => {
    // 1. Prioridad: Query Param en la URL (ej: ?lang=en) para compartir enlaces
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'en' || urlLang === 'es') {
        localStorage.setItem('app_locale', urlLang); // Guardamos la preferencia
        return urlLang;
      }
    }

    // 2. Prioridad: Preferencia guardada en LocalStorage
    const saved = localStorage.getItem('app_locale');
    if (saved === 'en' || saved === 'es') return saved;

    // 3. Prioridad: Idioma del navegador (Detección automática)
    if (typeof navigator !== 'undefined' && navigator.language.startsWith('en')) {
      return 'en';
    }

    // 4. Default
    return 'es';
  });

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('app_locale', newLocale);
  };

  const value = useMemo(() => ({ locale, setLocale: handleSetLocale }), [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
