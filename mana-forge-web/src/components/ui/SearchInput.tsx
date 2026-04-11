import { type ReactNode } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange?: (value: string) => void;
  onSearch?: () => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string | boolean;
  buttonLabel?: string;
  buttonIcon?: ReactNode;
  disabled?: boolean;
}

/**
 * Componente de Input de Búsqueda con botón integrado y tipado fuerte.
 */
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  label,
  placeholder = 'Buscar...',
  hint,
  error,
  buttonLabel,
  buttonIcon,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled && onSearch) {
      onSearch();
    }
  };

  // Estilos dinámicos
  const baseInputStyles =
    'w-full bg-zinc-950 border px-4 py-3 outline-none transition-all rounded-l-xl flex-1';
  const errorStyles =
    'border-orange-500 text-orange-500 placeholder-orange-500/50 focus:ring-2 focus:ring-orange-500/20 z-10 relative';
  const normalStyles =
    'border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800';
  const disabledStyles = 'opacity-50 cursor-not-allowed bg-zinc-900';

  let inputClass = baseInputStyles;
  if (disabled) inputClass += ` ${disabledStyles}`;
  else if (error) inputClass += ` ${errorStyles}`;
  else inputClass += ` ${normalStyles}`;

  return (
    <div className="w-full mb-4">
      {label && (
        <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="flex shadow-sm">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
        <button
          onClick={onSearch}
          disabled={disabled}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-r-xl shadow-lg shadow-orange-900/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 border-t border-b border-r border-orange-600 whitespace-nowrap"
        >
          {buttonIcon ? buttonIcon : !buttonLabel && <Search size={20} />}
          {buttonLabel && <span>{buttonLabel}</span>}
        </button>
      </div>

      {(error || hint) && (
        <span
          className={`text-xs mt-2 font-medium block ${
            error ? 'text-orange-500' : 'text-zinc-500'
          }`}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
};

export default SearchInput;
