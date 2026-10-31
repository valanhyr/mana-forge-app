import SearchInput from '../ui/SearchInput';
import { useTranslation } from '../../hooks/useTranslation';

interface CardSearchProps {
  query: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onPick: (cardName: string) => void;
}

const CardSearch = ({ query, onChange, suggestions, onPick }: CardSearchProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <SearchInput
        label={t('deckBuilder.addCardsLabel')}
        placeholder={t('deckBuilder.addCardsPlaceholder')}
        value={query}
        onChange={onChange}
      />

      {suggestions.length > 0 && (
        <ul className="absolute top-[85px] left-0 right-0 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl z-50 max-h-[160px] overflow-y-auto py-1">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion}
              className="px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-orange-500 cursor-pointer transition-colors border-b border-zinc-800/50 last:border-0"
              onClick={() => onPick(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CardSearch;
