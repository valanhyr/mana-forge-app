import React, { useMemo } from "react";
import { CheckCircle, Circle } from "lucide-react";

export interface DeckCard {
  id: string;
  name: string;
  quantity: number;
  manaCost?: string; // e.g., "{1}{G}{U}"
  type: string; // e.g., "Creature", "Instant", "Land"
  price?: number;
  inCollection?: boolean; // Para el icono de check
}

interface DeckListProps {
  cards: DeckCard[];
  onCardClick?: (id: string) => void;
}

// Componente auxiliar para renderizar iconos de maná
const ManaCost = ({ cost }: { cost?: string }) => {
  if (!cost) return null;

  // Simple parser para separar símbolos como {1}, {G}, {U}
  const symbols = cost.match(/\{([^}]+)\}/g) || [];

  const colorMap: Record<string, string> = {
    "{W}": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "{U}": "bg-blue-100 text-blue-800 border-blue-200",
    "{B}": "bg-gray-800 text-gray-100 border-gray-600",
    "{R}": "bg-red-100 text-red-800 border-red-200",
    "{G}": "bg-green-100 text-green-800 border-green-200",
    "{C}": "bg-gray-400 text-gray-800 border-gray-500",
    "{X}": "bg-zinc-700 text-zinc-300 border-zinc-600",
  };

  return (
    <div className="flex gap-0.5 justify-end">
      {symbols.map((sym, idx) => {
        const style =
          colorMap[sym] ||
          (!isNaN(parseInt(sym.replace(/[{}]/g, "")))
            ? "bg-zinc-700 text-zinc-300 border-zinc-600" // Generic mana numbers
            : "bg-zinc-700 text-zinc-300 border-zinc-600"); // Fallback

        return (
          <span
            key={idx}
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold ${style}`}
          >
            {sym.replace(/[{}]/g, "")}
          </span>
        );
      })}
    </div>
  );
};

const DeckList: React.FC<DeckListProps> = ({ cards, onCardClick }) => {
  // Agrupar cartas por tipo
  const groupedCards = useMemo(() => {
    const groups: Record<string, DeckCard[]> = {};
    cards.forEach((card) => {
      const type = card.type || "Unknown";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(card);
    });
    return groups;
  }, [cards]);

  // Orden de tipos preferido
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

  const sortedTypes = Object.keys(groupedCards).sort((a, b) => {
    const indexA = typeOrder.indexOf(a);
    const indexB = typeOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="w-full space-y-6">
      {sortedTypes.map((type) => {
        const groupCards = groupedCards[type];
        const totalCount = groupCards.reduce((acc, c) => acc + c.quantity, 0);
        const totalPrice = groupCards.reduce(
          (acc, c) => acc + (c.price || 0) * c.quantity,
          0
        );

        return (
          <div
            key={type}
            className="bg-zinc-900/50 rounded-xl border border-zinc-800 overflow-hidden"
          >
            {/* Header del Grupo */}
            <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-200 uppercase text-sm tracking-wider">
                  {type}
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
                  className="flex items-center justify-between px-4 py-2 hover:bg-zinc-800/50 transition-colors group"
                >
                  {/* Grupo Izquierda: Cantidad y Nombre */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                    <div className="w-8 text-right flex-shrink-0">
                      <span className="text-zinc-400 font-mono text-sm group-hover:text-zinc-200">
                        {card.quantity}
                      </span>
                    </div>

                    <button
                      onClick={() => onCardClick && onCardClick(card.id)}
                      className="text-zinc-300 font-medium text-sm hover:text-orange-500 hover:underline truncate text-left transition-colors"
                    >
                      {card.name}
                    </button>
                  </div>

                  {/* Grupo Derecha: Maná, Precio, Check */}
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="w-24 flex justify-end">
                      <ManaCost cost={card.manaCost} />
                    </div>

                    <div className="w-16 text-right text-zinc-500 text-xs font-mono">
                      €{(card.price || 0).toFixed(2)}
                    </div>

                    <div className="w-6 flex justify-end">
                      {card.inCollection ? (
                        <CheckCircle size={14} className="text-green-600/70" />
                      ) : (
                        <Circle size={14} className="text-zinc-700" />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default DeckList;
