// v1.1.0
// Etiqueta de metadato genérica. Mantiene el nombre exportado por
// compatibilidad, pero no usa el patrón visual de badge/píldora.
import React from 'react';

type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger';

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const toneMap: Record<Tone, string> = {
  neutral: 'text-muted border-line-strong',
  brand: 'text-brand-700 dark:text-brand-300 border-brand-600',
  ok: 'text-ok-strong dark:text-ok border-ok',
  warn: 'text-warn-strong dark:text-warn border-warn',
  danger: 'text-danger-strong dark:text-danger border-danger',
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  icon,
  className = '',
}) => (
  <span
    className={`inline-flex items-center gap-1.5 border-l-2 pl-2 text-xs font-semibold leading-none ${toneMap[tone]} ${className}`}
  >
    {icon}
    {children}
  </span>
);
