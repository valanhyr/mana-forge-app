interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Superficie del design system. Reemplaza las 33 copias de
 * `bg-zinc-900 border border-zinc-800 shadow-lg`.
 */
export default function Card({ className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface border border-zinc-800 rounded-xl shadow-lg ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: CardProps) {
  return (
    <div className={`mb-6 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  icon,
  children,
  ...rest
}: CardProps & { icon?: React.ReactNode }) {
  return (
    <h3
      className={`text-xl font-bold text-white flex items-center gap-2 ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </h3>
  );
}