import { Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  disabled?: boolean;
  /** Etiqueta del interruptor, ya localizada por quien lo usa. */
  toggleLabel: string;
  onVisibleChange: () => void;
  onChange: (value: string) => void;
}

/**
 * Campo de contraseña con interruptor de visibilidad. Estaba copiado tres
 * veces en Profile con tres estados booleanos distintos.
 */
export default function PasswordField({
  id,
  label,
  value,
  visible,
  disabled,
  toggleLabel,
  onVisibleChange,
  onChange,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-surface-sunken border border-zinc-800 rounded-control py-2.5 px-4 pr-10 text-white transition-all disabled:opacity-50 focus:outline-none focus:ring-1 focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={onVisibleChange}
          aria-label={toggleLabel}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}