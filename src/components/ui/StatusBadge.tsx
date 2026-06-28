// v1.1.0
// Indicador de estado del activo/medición. Mantiene la API anterior
// (estado + size), pero evita el patrón visual de badge/píldora.
import React from 'react';
import { EstadoActivo, EstadoMedicion } from '../../data/types';

type EstadoType = EstadoActivo | EstadoMedicion;

interface StatusBadgeProps {
  estado: EstadoType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<EstadoType, { marker: string; text: string; label: string }> = {
  normal:        { marker: 'bg-ok',        text: 'text-ok-strong dark:text-ok',             label: 'Normal' },
  alerta:        { marker: 'bg-warn',      text: 'text-warn-strong dark:text-warn',         label: 'Alerta' },
  critico:       { marker: 'bg-danger',    text: 'text-danger-strong dark:text-danger',     label: 'Crítico' },
  mantenimiento: { marker: 'bg-brand-600', text: 'text-brand-700 dark:text-brand-300',      label: 'Mantenimiento' },
  revision:      { marker: 'bg-warn',      text: 'text-warn-strong dark:text-warn',         label: 'Revisión' },
  urgente:       { marker: 'bg-danger',    text: 'text-danger-strong dark:text-danger',     label: 'Urgente' },
};

const sizeConfig = {
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2',
  lg: 'text-base gap-2',
};

const markerSize = { sm: 'w-1 h-3', md: 'w-1 h-4', lg: 'w-1.5 h-5' };

export const StatusBadge: React.FC<StatusBadgeProps> = ({ estado, size = 'md' }) => {
  const config = statusConfig[estado] || statusConfig.normal;
  return (
    <span
      className={`inline-flex items-center font-semibold leading-none ${config.text} ${sizeConfig[size]}`}
    >
      <span className={`rounded-sm ${config.marker} ${markerSize[size]}`} />
      {config.label}
    </span>
  );
};
