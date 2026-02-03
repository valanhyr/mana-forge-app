interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  error?: string | boolean;
  disabled?: boolean;
  minHeight?: string;
  maxHeight?: string;
  rows?: number;
}

/**
 * Componente de área de texto para entradas de múltiples líneas.
 * Soporta redimensionamiento vertical y scroll automático al superar maxHeight.
 */
const TextAreaInput: React.FC<TextAreaInputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  hint,
  error,
  disabled = false,
  minHeight = "120px",
  maxHeight = "300px",
  rows = 4,
}) => {
  // Estilos dinámicos
  const baseInputStyles =
    "w-full bg-zinc-950 border px-4 py-3 outline-none transition-all rounded-xl resize-y scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent";

  const errorStyles =
    "border-orange-500 text-orange-500 placeholder-orange-500/50 focus:ring-2 focus:ring-orange-500/20";

  const normalStyles =
    "border-zinc-800 text-white focus:border-zinc-600 focus:ring-2 focus:ring-zinc-800 placeholder-zinc-600";

  const disabledStyles = "opacity-50 cursor-not-allowed bg-zinc-900";

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

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClass}
        rows={rows}
        style={{ minHeight, maxHeight }}
      />

      {(error || hint) && (
        <span
          className={`text-xs mt-1 font-medium block ${
            error ? "text-orange-500" : "text-zinc-500"
          }`}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
};

export default TextAreaInput;
