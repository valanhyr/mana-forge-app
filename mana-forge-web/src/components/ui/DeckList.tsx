import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  Circle,
  AlertTriangle,
  Trash2,
  Plus,
  Minus,
  MoreVertical,
  ArrowRightLeft,
  Crown,
} from "lucide-react";
import { ManaSymbolService } from "../../services/ManaSymbolService";

export interface DeckCard {
  id: string;
  name: string;
  quantity: number;
  manaCost?: string; // e.g., "{1}{G}{U}"
  cmc?: number; // Coste de maná convertido para estadísticas
  type: string; // e.g., "Creature", "Instant", "Land"
  price?: number;
  inCollection?: boolean; // Para el icono de check
  isValid?: boolean; // Para marcar si es legal en el formato
  board?: "main" | "side" | "commander";
}

interface DeckListProps {
  cards: DeckCard[];
  onCardClick?: (id: string) => void;
  onUpdateQuantity?: (card: DeckCard, delta: number) => void;
  onRemove?: (card: DeckCard) => void;
  onMoveToBoard?: (
    card: DeckCard,
    board: "main" | "side" | "commander"
  ) => void;
  maxSideboardSize?: number;
  minMainDeckSize?: number;
  isCommanderFormat?: boolean;
}

// Componente auxiliar para renderizar iconos de maná
const ManaCost = ({
  cost,
  symbols,
}: {
  cost?: string;
  symbols: Record<string, string>;
}) => {
  if (!cost) return null;

  // Simple parser para separar símbolos como {1}, {G}, {U}
  const symbolsList = cost.match(/\{([^}]+)\}/g) || [];

  return (
    <div className="flex gap-0.5 justify-end items-center">
      {symbolsList.map((sym, idx) => {
        const svgUri = symbols[sym];
        if (svgUri) {
          return (
            <img
              key={idx}
              src={svgUri}
              alt={sym}
              className="w-4 h-4 shadow-sm rounded-full"
              loading="lazy"
            />
          );
        }
        // Fallback texto si no carga la imagen
        return (
          <span key={idx} className="text-xs text-zinc-500 font-mono">
            {sym}
          </span>
        );
      })}
    </div>
  );
};

const DeckList: React.FC<DeckListProps> = ({
  cards,
  onCardClick,
  onUpdateQuantity,
  onRemove,
  onMoveToBoard,
  maxSideboardSize,
  minMainDeckSize,
  isCommanderFormat = false,
}) => {
  const [activeCard, setActiveCard] = useState<DeckCard | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [manaSymbols, setManaSymbols] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveCard(null);
      }
    };
    // Cerrar al hacer scroll para evitar que el menú se quede flotando
    const handleScroll = () => setActiveCard(null);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Cargar símbolos de maná al montar
  useEffect(() => {
    ManaSymbolService.getAll().then(setManaSymbols);
  }, []);

  // Agrupar cartas por board (main/side) y luego por tipo
  const groupedAndSortedCards = useMemo(() => {
    const boardOrder: Array<"commander" | "main" | "side"> = [
      "commander",
      "main",
      "side",
    ];
    const typeOrder = [
      "Commander",
      "Creature",
      "Instant",
      "Sorcery",
      "Enchantment",
      "Artifact",
      "Planeswalker",
      "Land",
    ];

    const grouped: Record<string, Record<string, DeckCard[]>> = {};

    cards.forEach((card) => {
      const board = card.board || "main";
      const type = card.type || "Unknown";
      if (!grouped[board]) grouped[board] = {};
      if (!grouped[board][type]) grouped[board][type] = [];
      grouped[board][type].push(card);
    });

    const sortedBoards = boardOrder.filter((b) => grouped[b]);

    return sortedBoards.map((board) => ({
      boardName: board,
      types: Object.keys(grouped[board])
        .sort((a, b) => {
          const indexA = typeOrder.indexOf(a);
          const indexB = typeOrder.indexOf(b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        })
        .map((type) => ({ typeName: type, cards: grouped[board][type] })),
    }));
  }, [cards]);

  return (
    <div className="w-full space-y-8" ref={menuRef}>
      {groupedAndSortedCards.map(({ boardName, types }) => {
        const totalBoardCards = types.reduce(
          (acc, t) => acc + t.cards.reduce((a, c) => a + c.quantity, 0),
          0
        );

        const isMainDeck = boardName === "main";
        const isSideboard = boardName === "side";
        const isCommander = boardName === "commander";

        const showMainDeckWarning =
          isMainDeck &&
          minMainDeckSize !== undefined &&
          totalBoardCards > 0 &&
          totalBoardCards < minMainDeckSize;

        const showSideboardWarning =
          isSideboard &&
          maxSideboardSize !== undefined &&
          totalBoardCards > maxSideboardSize;

        // Si es formato Commander, ocultamos el sideboard si está vacío para no confundir,
        // o mostramos un aviso si tiene cartas (ya que no debería).
        if (isCommanderFormat && isSideboard && totalBoardCards === 0)
          return null;

        return (
          <div key={boardName}>
            <div
              className={`flex items-center gap-2 mb-4 ${
                isSideboard || isCommander
                  ? "mt-8 pt-4 border-t border-dashed border-zinc-700"
                  : ""
              }`}
            >
              <h3 className="text-xl font-bold text-orange-500">
                {isCommander && "Comandante"}
                {isMainDeck && "Mazo Principal"}
                {isSideboard && "Sideboard"}
              </h3>
              <span className="text-zinc-400 font-mono text-lg">
                ({totalBoardCards})
              </span>
              {showMainDeckWarning && (
                <div
                  title={`Faltan cartas (Mín: ${minMainDeckSize})`}
                  className="text-red-500 flex items-center gap-1 animate-pulse"
                >
                  <AlertTriangle size={20} />
                </div>
              )}
              {showSideboardWarning && (
                <div
                  title={`Límite excedido (Máx: ${maxSideboardSize})`}
                  className="text-red-500 flex items-center gap-1 animate-pulse"
                >
                  <AlertTriangle size={20} />
                </div>
              )}
            </div>
            <div className="space-y-6">
              {types.map(({ typeName, cards: groupCards }) => {
                const totalCount = groupCards.reduce(
                  (acc, c) => acc + c.quantity,
                  0
                );
                const totalPrice = groupCards.reduce(
                  (acc, c) => acc + (c.price || 0) * c.quantity,
                  0
                );

                return (
                  <div
                    key={typeName}
                    className="bg-zinc-900/50 rounded-xl border border-zinc-800"
                  >
                    {/* Header del Grupo */}
                    <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex justify-between items-center rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200 uppercase text-sm tracking-wider">
                          {typeName}
                        </span>
                        <span className="text-zinc-500 text-xs font-medium">
                          ({totalCount})
                        </span>
                      </div>
                      <span className="text-zinc-400 text-xs">
                        €{totalPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Lista de Cartas */}
                    <ul className="divide-y divide-zinc-800/50">
                      {groupCards.map((card) => (
                        <li
                          key={card.id}
                          className="flex items-center justify-between px-4 py-2 hover:bg-zinc-800/50 transition-colors group last:rounded-b-xl"
                        >
                          {/* Grupo Izquierda: Controles y Nombre */}
                          <div className="flex items-center gap-3 flex-1 min-w-0 mr-4 group/item">
                            <div className="flex items-center gap-1">
                              {onUpdateQuantity && (
                                <div className="flex flex-col opacity-0 group-hover/item:opacity-100 transition-opacity -ml-6 mr-1">
                                  <button
                                    onClick={() => onUpdateQuantity(card, 1)}
                                    className="text-zinc-500 hover:text-orange-500 p-0.5"
                                  >
                                    <Plus size={10} />
                                  </button>
                                  <button
                                    onClick={() => onUpdateQuantity(card, -1)}
                                    className="text-zinc-500 hover:text-orange-500 p-0.5"
                                  >
                                    <Minus size={10} />
                                  </button>
                                </div>
                              )}
                              <span className="text-zinc-400 font-mono text-sm font-bold w-6 text-center">
                                {card.quantity}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                onCardClick && onCardClick(card.id)
                              }
                              className={`${
                                card.isValid === false
                                  ? "text-red-500 hover:text-red-400"
                                  : "text-zinc-300 hover:text-orange-500"
                              } font-medium text-sm hover:underline truncate text-left transition-colors`}
                            >
                              {card.name}
                            </button>
                          </div>

                          {/* Grupo Derecha: Maná, Precio, Check */}
                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="w-24 flex justify-end">
                              <ManaCost
                                cost={card.manaCost}
                                symbols={manaSymbols}
                              />
                            </div>

                            <div className="w-16 text-right text-zinc-500 text-xs font-mono">
                              €{(card.price || 0).toFixed(2)}
                            </div>

                            <div className="w-6 flex justify-end">
                              {card.isValid === false ? (
                                <div title="Carta no válida para este formato">
                                  <AlertTriangle
                                    size={14}
                                    className="text-red-500"
                                  />
                                </div>
                              ) : card.inCollection ? (
                                <CheckCircle
                                  size={14}
                                  className="text-green-600/70"
                                />
                              ) : (
                                <Circle size={14} className="text-zinc-700" />
                              )}
                            </div>

                            {/* Menú de Opciones (3 puntos) */}
                            <div
                              className={`relative w-6 flex justify-end ${
                                activeCard?.id === card.id &&
                                activeCard?.board === card.board
                                  ? "z-20"
                                  : ""
                              }`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  setMenuPos({
                                    top: rect.bottom + 5,
                                    left: rect.right - 192,
                                  }); // 192px es el ancho del menú (w-48)
                                  setActiveCard(
                                    activeCard?.id === card.id &&
                                      activeCard?.board === card.board
                                      ? null
                                      : card
                                  );
                                }}
                                className={`text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-700 transition-colors cursor-pointer ${
                                  activeCard?.id === card.id &&
                                  activeCard?.board === card.board
                                    ? "opacity-100 text-white bg-zinc-700"
                                    : "opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Menú Flotante (Fixed Position) */}
      {activeCard && (
        <div
          className="fixed w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {onUpdateQuantity && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(activeCard, 1);
                }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
              >
                <Plus size={14} /> Añadir una
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuantity(activeCard, -1);
                }}
                className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
              >
                <Minus size={14} /> Quitar una
              </button>
            </>
          )}
          {onMoveToBoard && (
            <>
              {isCommanderFormat && activeCard.board !== "commander" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToBoard(activeCard, "commander");
                    setActiveCard(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <Crown size={14} />
                  Hacer Comandante
                </button>
              )}

              {activeCard.board !== "main" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToBoard(activeCard, "main");
                    setActiveCard(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <ArrowRightLeft size={14} />
                  Mover a Main
                </button>
              )}

              {activeCard.board !== "side" && !isCommanderFormat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToBoard(activeCard, "side");
                    setActiveCard(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 flex items-center gap-2"
                >
                  <ArrowRightLeft size={14} />
                  Mover a Sideboard
                </button>
              )}
            </>
          )}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(activeCard);
                setActiveCard(null);
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 border-t border-zinc-800"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DeckList;
