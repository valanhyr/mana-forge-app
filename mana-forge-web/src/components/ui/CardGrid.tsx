import { useMemo } from 'react';

export interface CardDisplayData {
  id: string;
  name: string;
  imageUrl: string;
}

interface CardGridProps {
  cards: CardDisplayData[];
  stacked?: boolean;
}

const CardGrid: React.FC<CardGridProps> = ({ cards, stacked = false }) => {
  // Agrupar cartas por nombre si el modo 'stacked' está activo
  const groupedCards = useMemo(() => {
    if (!stacked) {
      // Si no está apilado, cada carta es su propio grupo de 1
      return cards.map((c) => ({ ...c, group: [c] }));
    }

    const groups: Record<string, CardDisplayData[]> = {};
    cards.forEach((card) => {
      if (!groups[card.name]) {
        groups[card.name] = [];
      }
      groups[card.name].push(card);
    });

    return Object.values(groups).map((group) => ({
      ...group[0], // Usamos la primera carta como representante
      group,
    }));
  }, [cards, stacked]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 p-4">
      {groupedCards.map((item, groupIdx) => (
        <div
          key={`group-${groupIdx}-${item.name}`}
          className="relative aspect-[63/88]"
          style={{
            marginBottom: stacked ? `${(item.group.length - 1) * 28}px` : undefined,
          }}
        >
          {item.group.map((card, cardIdx) => {
            // Offset vertical reducido en un 20% (de 35px a 28px)
            const offset = stacked ? cardIdx * 28 : 0;

            return (
              <div
                key={card.id}
                className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg border border-zinc-900 transition-all duration-200 ease-out cursor-pointer hover:z-50 hover:scale-110 hover:-translate-y-16 hover:shadow-2xl hover:border-orange-500"
                style={{
                  zIndex: cardIdx, // Las cartas posteriores van encima
                  top: `${offset}px`,
                }}
              >
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-cover rounded-xl bg-zinc-800"
                  loading="lazy"
                />
              </div>
            );
          })}

          {/* Badge de cantidad si está apilado y hay más de una */}
          {stacked && item.group.length > 1 && (
            <div className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-[60] border border-zinc-900">
              {item.group.length}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CardGrid;
