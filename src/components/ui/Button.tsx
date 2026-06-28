// v1.1.0
// Botón del Design System. Variantes premium, efecto de presión,
// estados de carga, soporte de iconos.
import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const base =
  'press inline-flex items-center justify-center gap-2 font-semibold rounded-md select-none ' +
  'transition-all duration-200 ease-premium focus:outline-none focus-visible:shadow-ring ' +
  'disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

const variantMap: Record<Variant, string> = {
  primary: 'bg-brand-400 text-slate-900 hover:bg-brand-300 shadow-glow hover:shadow-glow-lg',
  secondary:
    'bg-surface text-content border border-line-strong hover:border-brand-400 hover:text-brand-300 hover:bg-subtle',
  ghost: 'bg-transparent text-muted hover:text-content hover:bg-subtle',
  danger: 'bg-danger text-white hover:brightness-110 shadow-soft',
  subtle: 'bg-brand-500/15 text-brand-300 hover:bg-brand-500/25',
};

const sizeMap: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  iconLeft,
  iconRight,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  return (
    <button
      className={[
        base,
        variantMap[variant],
        sizeMap[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
};
