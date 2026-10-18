import { useId } from 'react';

interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
}

/** Textarea del design system. Misma interfaz que `Input`, sin icono. */
export default function Textarea({
  label,
  error,
  hint,
  className = '',
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const inputId = generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-300">
        {label}
      </label>

      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`w-full bg-surface-sunken border rounded-control p-4 text-white transition-all resize-none
          focus:outline-none focus:ring-1 placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed
          ${
            error
              ? 'border-red-600 focus:border-red-500 focus:ring-red-500'
              : 'border-zinc-800 focus:border-brand-500 focus:ring-brand-500'
          }`}
        {...rest}
      />

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