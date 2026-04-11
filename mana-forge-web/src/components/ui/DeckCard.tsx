import { Link } from 'react-router-dom';
import { Users, ThumbsUp } from 'lucide-react';
import { type DeckSearchResult } from '../../services/DeckService';
import ManaCost from './ManaCost';

interface DeckCardProps {
  deck: DeckSearchResult;
}

const DeckCard = ({ deck }: DeckCardProps) => {
  return (
    <Link
      to={`/deck-viewer/${deck.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 transition-all shadow-lg"
    >
      <div className="aspect-video relative overflow-hidden">
        {deck.cardArtUrl ? (
          <img
            src={deck.cardArtUrl}
            alt={deck.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
            <span className="text-4xl font-black">MF</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
          <div className="flex gap-0.5">
            {deck.colors && deck.colors.length > 0 && (
              <ManaCost cost={deck.colors.map((c) => `{${c}}`).join('')} size={16} />
            )}
          </div>
          {deck.likesCount > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
              <ThumbsUp size={10} className="fill-orange-500 text-orange-500" />
              {deck.likesCount}
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-white group-hover:text-orange-500 transition-colors truncate">
          {deck.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
            {deck.formatName}
          </span>
          {deck.ownerUsername && (
            <span className="flex items-center gap-1 text-xs text-zinc-400">
              <Users size={12} />
              {deck.ownerUsername}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default DeckCard;
