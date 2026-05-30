import React from 'react';
import { EstadoActivo, EstadoMedicion } from '../../data/types';

type EstadoType = EstadoActivo | EstadoMedicion;

interface StatusBadgeProps {
  estado: EstadoType;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<EstadoType, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-emerald-500', text: 'text-white', label: 'NORMAL' },
  alerta: { bg: 'bg-orange-500', text: 'text-white', label: 'ALERTA' },
  critico: { bg: 'bg-red-600', text: 'text-white', label: 'CRÍTICO' },
  mantenimiento: { bg: 'bg-blue-600', text: 'text-white', label: 'MANT.' },
  revision: { bg: 'bg-yellow-500', text: 'text-slate-900', label: 'REVISIÓN' },
  urgente: { bg: 'bg-red-600', text: 'text-white', label: 'URGENTE' },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ estado, size = 'md' }) => {
  const config = statusConfig[estado] || statusConfig.normal;
  return (
    <span
      className={`inline-block font-mono font-bold uppercase tracking-widest border-2 border-slate-800 ${config.bg} ${config.text} ${sizeConfig[size]}`}
    >
      {config.label}
    </span>
  );
};
