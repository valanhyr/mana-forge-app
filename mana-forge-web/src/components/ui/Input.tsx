import { useId } from 'react';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>, FieldProps {
  id?: string;
  icon?: React.ReactNode;
}

/**
 * Input del design system. El label se asocia siempre por `htmlFor`: el
 * proyecto tenía 29 de 30 labels sin association, así que aquí es imposible
 * olvidarlo porque el componente la genera.
 */
export default function Input({
  label,
  error,
  hint,
  icon,
  id,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden>
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={`w-full bg-surface-sunken border rounded-control py-2.5 text-white transition-all
            focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : 'px-4'} pr-4
            ${
              error
                ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
                : 'border-zinc-800 focus:border-brand-500 focus:ring-brand-500'
            }`}
          {...rest}
        />
      </div>

      {message && (
        <p
          id={messageId}
          className={`text-xs ${error ? 'text-red-500' : 'text-zinc-500'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}