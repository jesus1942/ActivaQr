import React from 'react';
import { EstadoOperativo } from '../../data/types';

interface EstadoOperativoBadgeProps {
  estado: EstadoOperativo;
  size?: 'sm' | 'md' | 'lg';
}

const estadoConfig: Record<EstadoOperativo, { border: string; text: string; bg: string; label: string }> = {
  operativo:      { border: 'border-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-100/70', label: 'OPERATIVO' },
  pausa:          { border: 'border-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-100/70',   label: 'EN PAUSA' },
  mantenimiento:  { border: 'border-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-100/70',    label: 'MANTENIMIENTO' },
  montaje:        { border: 'border-purple-700',  text: 'text-purple-700',  bg: 'bg-purple-100/70',  label: 'EN MONTAJE' },
  fuera_servicio: { border: 'border-slate-600',   text: 'text-slate-700',   bg: 'bg-slate-200/70',   label: 'FUERA DE SERVICIO' },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export const EstadoOperativoBadge: React.FC<EstadoOperativoBadgeProps> = ({ estado, size = 'md' }) => {
  const config = estadoConfig[estado] || estadoConfig.operativo;
  return (
    <span
      className={`inline-block font-bold uppercase tracking-wider border-2 border-slate-900 ${config.border} ${config.text} ${config.bg} shadow-[2px_2px_0px_0px_#1e293b] ${sizeConfig[size]}`}
    >
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
