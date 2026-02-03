import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string | number;
  label: string;
}

interface DropdownInputProps {
  options: DropdownOption[];
  value: string | number;
  onChange: (value: any) => void;
  label?: string;
  placeholder?: string;
  error?: string | boolean;
  disabled?: boolean;
}

/**
 * Componente de Dropdown reutilizable con tipado fuerte.
 */
const DropdownInput: React.FC<DropdownInputProps> = ({
  options = [],
  value,
  onChange,
  label,
  placeholder = "Selecciona una opción",
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (optionValue: string | number) => {
    if (!disabled) {
      onChange(optionValue);
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Buscar la etiqueta de la opción seleccionada
  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Estilos base reutilizables
  const baseInputStyles =
    "w-full bg-zinc-950 border rounded-xl px-4 py-3 flex justify-between items-center cursor-pointer transition-all outline-none";
  const errorStyles = "border-orange-500 text-orange-500";
  const activeStyles = "border-orange-500 ring-2 ring-orange-500/20";
  const normalStyles = "border-zinc-800 text-white hover:border-zinc-700";
  const disabledStyles = "opacity-50 cursor-not-allowed bg-zinc-900";

  // Determinar clases dinámicas
  let inputClass = baseInputStyles;
  if (disabled) inputClass += ` ${disabledStyles}`;
  else if (error) inputClass += ` ${errorStyles}`;
  else if (isOpen) inputClass += ` ${activeStyles}`;
  else inputClass += ` ${normalStyles}`;

  return (
    <div className="relative w-full mb-2" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-zinc-500 mb-2 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className={inputClass} onClick={toggleDropdown}>
        <span
          className={`truncate ${
            !selectedOption && !error ? "text-zinc-500" : ""
          }`}
        >
          {displayText}
        </span>
        <ChevronDown
          size={20}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } ${error ? "text-orange-500" : "text-zinc-500"}`}
        />
      </div>

      {isOpen && !disabled && (
        <ul className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto py-1">
          {options.map((option) => (
            <li
              key={option.value}
              className={`px-4 py-3 cursor-pointer transition-colors text-sm ${
                option.value === value
                  ? "bg-orange-500/10 text-orange-500 font-medium"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {error && typeof error === "string" && (
        <span className="text-xs text-orange-500 mt-2 font-medium block">
          {error}
        </span>
      )}
    </div>
  );
};

export default DropdownInput;
