// v1.1.0
import React from 'react';
import { EstadoActivo, EstadoMedicion } from '../../data/types';

type EstadoType = EstadoActivo | EstadoMedicion;

interface StatusBadgeProps {
  estado: EstadoType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<EstadoType, { border: string; text: string; bg: string; label: string; rotate: string }> = {
  normal:       { border: 'border-emerald-600', text: 'text-emerald-700', bg: 'bg-emerald-100/70', label: 'NORMAL',   rotate: 'rotate-[-1deg]' },
  alerta:       { border: 'border-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-100/70',  label: 'ALERTA',   rotate: 'rotate-[1deg]'  },
  critico:      { border: 'border-red-700',     text: 'text-red-700',     bg: 'bg-red-100/70',     label: 'CRÍTICO',  rotate: 'rotate-[-1deg]' },
  mantenimiento:{ border: 'border-blue-700',    text: 'text-blue-700',    bg: 'bg-blue-100/70',    label: 'MANT.',    rotate: 'rotate-[1deg]'  },
  revision:     { border: 'border-yellow-600',  text: 'text-yellow-800',  bg: 'bg-yellow-100/70',  label: 'REVISIÓN', rotate: 'rotate-[-1deg]' },
  urgente:      { border: 'border-red-700',     text: 'text-red-700',     bg: 'bg-red-100/70',     label: 'URGENTE',  rotate: 'rotate-[1deg]'  },
};

const sizeConfig = {
  sm: 'text-base px-2.5 py-0.5',
  md: 'text-lg px-3 py-1',
  lg: 'text-xl px-4 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ estado, size = 'md' }) => {
  const config = statusConfig[estado] || statusConfig.normal;
  return (
    <span
      className={`inline-block font-sketch font-bold uppercase tracking-wider border-2 ${config.border} ${config.text} ${config.bg} ${config.rotate} ${sizeConfig[size]}`}
    >
      {config.label}
    </span>
  );
};
