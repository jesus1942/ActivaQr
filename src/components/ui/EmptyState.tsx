// v1.1.0
// Estado vacío elegante: icono en burbuja orgánica, título, descripción
// y acción opcional.
import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-up ${className}`}
  >
    {icon && (
      <div className="mb-5 grid place-items-center w-16 h-16 organic-blob bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300">
        {icon}
      </div>
    )}
    <h3 className="font-display text-lg font-bold text-content">{title}</h3>
    {description && (
      <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
