import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { type User } from "../core/models/User";
import { AuthService } from "../services/AuthService";
import { FormatService } from "../services/FormatService";
import { type Deck } from "../components/ui/DeckTable";
import { useTranslation } from "../hooks/useTranslation";

const STORAGE_KEY = "mana_forge_session";

interface UserContextType {
  user: User | null;
  decks: Deck[];
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  loadDecks: (force?: boolean) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  togglePinDeck: (deckId: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t, locale } = useTranslation();
  const [user, setUser] = useState<User | null>(() => {
    // Recuperar sesión al iniciar la app
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { user, expiry } = JSON.parse(stored);
        // Verificar si la sesión ha expirado
        if (new Date().getTime() < expiry) {
          return user;
        }
      } catch (e) {
        console.error("Error parsing session:", e);
      }
      // Si expiró o hay error, limpiar
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  });
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const lastLoadedLocale = useRef<string>(locale);

  const login = async (username: string, password: string) => {
    try {
      const userData = await AuthService.login(username, password);
      setUser(userData);

      // Guardar sesión por 30 días
      const expiry = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: userData, expiry })
      );
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ) => {
    try {
      await AuthService.register(username, email, password);
      // No auto-login: user must verify email first
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor:", error);
    }
    setUser(null);
    setDecks([]);
    localStorage.removeItem(STORAGE_KEY);
    // Intentar borrar las cookies (isLoged no suele ser HttpOnly, JSESSIONID sí lo es)
    document.cookie =
      "isLogged=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "JSESSIONID=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  };

  // Verificar si la sesión es válida en el servidor al cargar la app
  useEffect(() => {
    AuthService.checkSession()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setIsSessionLoading(false);
      });
  }, []);

  // Lógica de caché inteligente para mazos
  const loadDecks = useCallback(
    async (force = false) => {
      if (!user) return;

      // Verificar si cambió el idioma para invalidar caché
      const localeChanged = lastLoadedLocale.current !== locale;

      // Si ya tenemos datos, no forzamos y no cambió el idioma, usamos caché
      if (decks.length > 0 && !force && !localeChanged) {
        console.log("Usando mazos en caché (UserContext)");
        return;
      }
      lastLoadedLocale.current = locale;

      try {
        // 1. Obtener los formatos (usará caché si ya están cargados)
        const formatsRaw = await FormatService.getActiveFormats();
        const formats = formatsRaw.map((f: any) => {
          let parsedName = f.name;
          // Si el nombre viene como string JSON, lo parseamos
          if (typeof f.name === "string" && f.name.startsWith("{")) {
            try {
              parsedName = JSON.parse(f.name);
            } catch (e) {
              console.error("Error parsing format name:", f.name);
            }
          }
          return {
            ...f,
            id: f.id || f._id,
            name: parsedName,
          };
        });
        const formatMap = new Map(formats.map((f) => [f.id, f]));

        // 2. Obtener los mazos del usuario
        const fetchedDecks = await AuthService.getUserDecks(user.userId);

        // 3. Mapear respuesta del backend a la interfaz de UI
        const mappedDecks: Deck[] = fetchedDecks.map((d: any) => {
          const format = formatMap.get(d.formatId);
          // Usar el idioma actual, fallback a inglés, luego español, luego ID
          const formatName =
            format?.name?.[locale] ||
            format?.name?.en ||
            format?.name?.es ||
            d.formatId;

          return {
            id: d.id,
            name: d.name,
            format: formatName,
            colors: d.colors || [],
            lastUpdated: t("common.recent"), // TODO: Añadir campo timestamp en Deck.java
            isPrivate: d.private,
            isPinned: d.pinned || false,
          };
        });

        setDecks(mappedDecks);
      } catch (error) {
        console.error("Error cargando mazos:", error);
      }
    },
    [user, decks.length, locale, t]
  );

  const deleteDeck = async (deckId: string) => {
    try {
      const { DeckService } = await import("./DeckService");
      await DeckService.deleteDeck(deckId);
      setDecks((prev) => prev.filter((d) => d.id !== deckId));
    } catch (error) {
      console.error("Error deleting deck:", error);
      throw error;
    }
  };

  const togglePinDeck = async (deckId: string) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    try {
      const { DeckService } = await import("./DeckService");
      if (deck.isPinned) {
        await DeckService.unpinDeck(deckId);
      } else {
        await DeckService.pinDeck(deckId);
      }
      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, isPinned: !d.isPinned } : d))
      );
    } catch (error) {
      console.error("Error toggling pin:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        decks,
        isAuthenticated: !!user,
        isSessionLoading,
        login,
        register,
        logout,
        loadDecks,
        deleteDeck,
        togglePinDeck,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
