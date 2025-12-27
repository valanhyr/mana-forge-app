import React, { createContext, useContext, useState, useCallback } from "react";
import { type User } from "../core/models/User";
import { AuthService } from "../services/AuthService";
import { FormatService } from "../services/FormatService";
import { type Deck } from "../components/ui/DeckTable";

const STORAGE_KEY = "mana_forge_session";

interface UserContextType {
  user: User | null;
  decks: Deck[];
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadDecks: (force?: boolean) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

  const logout = () => {
    setUser(null);
    setDecks([]);
    localStorage.removeItem(STORAGE_KEY);
    // Intentar borrar la cookie isLoged (si no es HttpOnly)
    document.cookie =
      "isLoged=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  };

  // Lógica de caché inteligente para mazos
  const loadDecks = useCallback(
    async (force = false) => {
      if (!user) return;

      // Si ya tenemos datos y no forzamos actualización, usamos caché
      if (decks.length > 0 && !force) {
        console.log("Usando mazos en caché (UserContext)");
        return;
      }

      try {
        // 1. Obtener los formatos (usará caché si ya están cargados)
        const formats = await FormatService.getActiveFormats();
        const formatMap = new Map(formats.map((f) => [f.id, f]));

        // 2. Obtener los mazos del usuario
        const fetchedDecks = await AuthService.getUserDecks(user.userId);

        // 3. Mapear respuesta del backend a la interfaz de UI
        const mappedDecks: Deck[] = fetchedDecks.map((d: any) => {
          const format = formatMap.get(d.formatId);
          return {
            id: d.id,
            name: d.name,
            format: format?.name.es || format?.name.en || d.formatId, // Usar el nombre del formato
            colors: d.colors || [],
            lastUpdated: "Reciente", // TODO: Añadir campo timestamp en Deck.java
            isPrivate: d.private, // Jackson serializa 'isPrivate' como 'private' por defecto
            isPinned: false,
          };
        });

        setDecks(mappedDecks);
      } catch (error) {
        console.error("Error cargando mazos:", error);
      }
    },
    [user, decks.length]
  );

  return (
    <UserContext.Provider
      value={{
        user,
        decks,
        isAuthenticated: !!user,
        login,
        logout,
        loadDecks,
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
