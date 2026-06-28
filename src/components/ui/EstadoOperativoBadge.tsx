// v1.1.0
// Indicador de estado operativo. Conserva la API anterior, sin renderizar
// como badge/píldora.
import React from 'react';
import { EstadoOperativo } from '../../data/types';

interface EstadoOperativoBadgeProps {
  estado: EstadoOperativo;
  size?: 'sm' | 'md' | 'lg';
}

const estadoConfig: Record<EstadoOperativo, { marker: string; text: string; label: string }> = {
  operativo:      { marker: 'bg-ok',         text: 'text-ok-strong dark:text-ok',            label: 'Operativo' },
  pausa:          { marker: 'bg-warn',       text: 'text-warn-strong dark:text-warn',        label: 'En pausa' },
  mantenimiento:  { marker: 'bg-brand-600',  text: 'text-brand-700 dark:text-brand-300',     label: 'Mantenimiento' },
  montaje:        { marker: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-300',   label: 'En montaje' },
  fuera_servicio: { marker: 'bg-faint',      text: 'text-muted',                             label: 'Fuera de servicio' },
};

const sizeConfig = {
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2',
  lg: 'text-base gap-2',
};

const markerSize = { sm: 'w-1 h-3', md: 'w-1 h-4', lg: 'w-1.5 h-5' };

export const EstadoOperativoBadge: React.FC<EstadoOperativoBadgeProps> = ({ estado, size = 'md' }) => {
  const config = estadoConfig[estado] || estadoConfig.operativo;
  return (
    <span
      className={`inline-flex items-center font-semibold leading-none ${config.text} ${sizeConfig[size]}`}
    >
      <span className={`rounded-sm ${config.marker} ${markerSize[size]}`} />
      {config.label}
    </span>
  );
};

export const ESTADOS_OPERATIVOS: { value: EstadoOperativo; label: string }[] = [
  { value: 'operativo', label: 'Operativo' },
  { value: 'pausa', label: 'En pausa' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'montaje', label: 'En montaje' },
  { value: 'fuera_servicio', label: 'Fuera de servicio' },
];
