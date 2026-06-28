// v1.1.0
// Tarjeta base del Design System. Bordes redondeados grandes, sombras
// muy sutiles, microinteracción de elevación opcional al hover.
import React from 'react';

type Radius = 'sm' | 'md' | 'lg' | 'xl';
type Pad = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  radius?: Radius;
  padding?: Pad;
  interactive?: boolean;   // habilita hover/elevación + cursor pointer
  flat?: boolean;          // sin sombra (solo borde)
  as?: 'div' | 'button' | 'article' | 'section';
}

const radiusMap: Record<Radius, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
};

const padMap: Record<Pad, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card: React.FC<CardProps> = ({
  radius = 'lg',
  padding = 'md',
  interactive = false,
  flat = false,
  as = 'div',
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={[
        'bg-surface border border-line transition-all duration-200 ease-premium',
        radiusMap[radius],
        padMap[padding],
        flat ? '' : 'shadow-soft',
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
};
