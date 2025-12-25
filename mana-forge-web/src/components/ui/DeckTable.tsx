import React from "react";
import { Star, Info, MoreVertical, Shield } from "lucide-react";

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
  onMore?: (id: string) => void;
}

const ManaIcon = ({ color }: { color: string }) => {
  const colorMap: Record<string, string> = {
    W: "bg-yellow-100 text-yellow-800 border-yellow-200",
    U: "bg-blue-100 text-blue-800 border-blue-200",
    B: "bg-gray-800 text-gray-100 border-gray-600",
    R: "bg-red-100 text-red-800 border-red-200",
    G: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold mr-1 ${
        colorMap[color] || "bg-gray-200 text-gray-800"
      }`}
    >
      {color}
    </span>
  );
};

const DeckTable: React.FC<DeckTableProps> = ({
  decks,
  onPin,
  onInfo,
  onMore,
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
      <table className="w-full text-left text-sm text-zinc-400">
        <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
          <tr>
            <th scope="col" className="px-6 py-3 font-medium">
              Nombre del Mazo
            </th>
            <th
              scope="col"
              className="hidden px-6 py-3 font-medium xl:table-cell"
            >
              Colores
            </th>
            <th
              scope="col"
              className="hidden px-6 py-3 font-medium xl:table-cell"
            >
              Formato
            </th>
            <th
              scope="col"
              className="hidden px-6 py-3 font-medium lg:table-cell"
            >
              Actualizado
            </th>
            <th scope="col" className="px-6 py-3 text-right font-medium">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {decks.map((deck) => (
            <tr
              key={deck.id}
              className="group cursor-pointer transition-colors hover:bg-zinc-900/50"
            >
              <td className="px-6 py-4">
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
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200 group-hover:text-orange-500 transition-colors">
                        {deck.name}
                      </span>
                      {deck.isPrivate && (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                          <Shield size={10} /> PRIVADO
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 xl:hidden">
                      {deck.format}
                    </span>
                  </div>
                </div>
              </td>
              <td className="hidden px-6 py-4 xl:table-cell">
                <div className="flex items-center">
                  {deck.colors.map((c) => (
                    <ManaIcon key={c} color={c} />
                  ))}
                </div>
              </td>
              <td className="hidden px-6 py-4 xl:table-cell">
                <span className="inline-flex items-center rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-800">
                  {deck.format}
                </span>
              </td>
              <td className="hidden px-6 py-4 text-xs lg:table-cell">
                {deck.lastUpdated}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onInfo && onInfo(deck.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <Info size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMore && onMore(deck.id);
                    }}
                    className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeckTable;
