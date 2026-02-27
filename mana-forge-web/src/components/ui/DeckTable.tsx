import { useState, useEffect } from "react";
import {
  Star,
  Info,
  MoreVertical,
  Shield,
  Edit,
  Copy,
  Trash2,
} from "lucide-react";
import { ManaSymbolService } from "../../services/ManaSymbolService";
import { useTranslation } from "../../hooks/useTranslation";

export interface Deck {
  id: string;
  name: string;
  format: string;
  colors: string[]; // e.g., ['W', 'U', 'B', 'R', 'G']
  lastUpdated: string;
  isPrivate?: boolean;
  isPinned?: boolean;
}

interface DeckTableProps {
  decks: Deck[];
  onPin?: (id: string) => void;
  onInfo?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const DeckTable: React.FC<DeckTableProps> = ({
  decks,
  onPin,
  onInfo,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [manaSymbols, setManaSymbols] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleClickOutside = () => setActiveDeckId(null);
    const handleScroll = () => setActiveDeckId(null);

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Cargar símbolos de maná al montar
  useEffect(() => {
    ManaSymbolService.getAll().then(setManaSymbols);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <table className="w-full text-left text-sm text-zinc-400 border-collapse">
        <thead className="hidden md:table-header-group bg-zinc-900 text-xs uppercase text-zinc-500">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              {t("myDecks.table.name")}
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              {t("myDecks.table.colors")}
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              {t("myDecks.table.format")}
            </th>
            <th scope="col" className="px-6 py-3 font-medium">
              {t("myDecks.table.updated")}
            </th>
            <th scope="col" className="px-6 py-3 text-right font-medium">
              {t("myDecks.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {decks.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-6 py-12 text-center text-zinc-500 md:table-cell"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-lg font-medium">{t("myDecks.noDecks")}</p>
                  <p className="text-sm">{t("myDecks.noDecksDescription")}</p>
                </div>
              </td>
            </tr>
          ) : (
            decks.map((deck) => (
              <tr
                key={deck.id}
                className="flex flex-col md:table-row group cursor-pointer transition-colors hover:bg-zinc-900/50"
              >
                {/* Nombre y Pin */}
                <td className="px-6 py-4 md:table-cell">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin && onPin(deck.id);
                      }}
                      className={`transition-colors hover:text-orange-500 ${
                        deck.isPinned ? "text-orange-500" : "text-zinc-600"
                      }`}
                    >
                      <Star
                        size={16}
                        fill={deck.isPinned ? "currentColor" : "none"}
                      />
                    </button>
                    <div className="flex flex-col gap-1">
                      <span className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors break-words">
                        {deck.name}
                      </span>
                      {deck.isPrivate && (
                        <div className="flex">
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 border border-zinc-800">
                            <Shield size={10} />
                            {t("common.private").toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Colores */}
                <td className="px-6 py-2 md:py-4 md:table-cell border-t border-zinc-900/50 md:border-t-0">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <span className="text-xs font-medium uppercase text-zinc-600 md:hidden">
                      {t("myDecks.table.colors")}
                    </span>
                    <div className="flex items-center">
                      {deck.colors.map((color) => {
                        const symbolKey = `{${color}}`;
                        const svgUri = manaSymbols[symbolKey];
                        return svgUri ? (
                          <img
                            key={color}
                            src={svgUri}
                            alt={color}
                            className="w-4 h-4 mr-1 rounded-full shadow-sm"
                          />
                        ) : null;
                      })}
                      {deck.colors.length === 0 && (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Formato */}
                <td className="px-6 py-2 md:py-4 md:table-cell border-t border-zinc-900/50 md:border-t-0">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <span className="text-xs font-medium uppercase text-zinc-600 md:hidden">
                      {t("myDecks.table.format")}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-zinc-900/50 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800 md:bg-zinc-900">
                      {deck.format}
                    </span>
                  </div>
                </td>

                {/* Última Actualización */}
                <td className="px-6 py-2 md:py-4 md:table-cell border-t border-zinc-900/50 md:border-t-0 text-xs text-zinc-500">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <span className="text-xs font-medium uppercase text-zinc-600 md:hidden">
                      {t("myDecks.table.updated")}
                    </span>
                    <span>{deck.lastUpdated}</span>
                  </div>
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 md:table-cell border-t border-zinc-900/50 md:border-t-0 text-right">
                  <div className="flex items-center justify-end gap-2 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInfo && onInfo(deck.id);
                      }}
                      className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors hidden md:block"
                      title={t("common.info")}
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({
                          top: rect.bottom + 5,
                          left: rect.right - 192,
                        });
                        setActiveDeckId(
                          activeDeckId === deck.id ? null : deck.id
                        );
                      }}
                      className={`p-2 transition-colors rounded-md cursor-pointer ${
                        activeDeckId === deck.id
                          ? "text-white bg-zinc-800"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Menú Flotante (Fixed Position) */}
      {activeDeckId && (
        <div
          className="fixed w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            onClick={() => onEdit && onEdit(activeDeckId)}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2 transition-colors"
          >
            <Edit size={14} /> {t("common.edit")}
          </button>
          <button
            onClick={() => onDuplicate && onDuplicate(activeDeckId)}
            className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2 transition-colors"
          >
            <Copy size={14} /> {t("common.duplicate")}
          </button>
          <div className="border-t border-zinc-800 my-1"></div>
          <button
            onClick={() => onDelete && onDelete(activeDeckId)}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={14} /> {t("common.delete")}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeckTable;
