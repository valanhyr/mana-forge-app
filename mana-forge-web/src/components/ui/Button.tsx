import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-orange-900/20',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white',
  ghost: 'text-zinc-400 hover:text-white hover:bg-zinc-800',
  destructive: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5',
};

/**
 * Botón del design system. `type` es `button` por defecto a propósito: un
 * botón dentro de un `<form>` no debe enviarlo sin querer.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}