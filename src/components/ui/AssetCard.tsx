import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activo, Medicion } from '../../data/types';
import { StatusBadge } from './StatusBadge';
import { MapPin, Clock, User } from 'lucide-react';

interface AssetCardProps {
  activo: Activo;
  lastMedicion?: Medicion;
}

export const AssetCard: React.FC<AssetCardProps> = ({ activo, lastMedicion }) => {
  const navigate = useNavigate();
  const qrValue = `${window.location.origin}/medicion/${activo.id}`;

  return (
    <div
      className="bg-[#FFFEF7] border-2 border-slate-700 shadow-[4px_4px_0px_0px_#1e293b] cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e293b] transition-all duration-150 p-4"
      onClick={() => navigate(`/activos/${activo.id}`)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <StatusBadge estado={activo.estado} size="sm" />
        <span className="font-sketch text-base font-bold uppercase bg-slate-100 border border-slate-300 px-2 py-0.5 text-slate-600 rotate-[1deg]">
          {activo.sector}
        </span>
      </div>

      {/* Code & Name */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <div className="font-sketch font-black text-2xl text-slate-900 leading-tight">{activo.codigo}</div>
          <div className="font-semibold text-slate-700 text-sm mt-0.5 leading-snug">{activo.nombre}</div>
          <div className="text-xs text-slate-500 mt-1">{activo.marca} {activo.modelo}</div>
        </div>
        {/* QR como pegado con cinta */}
        <div className="border-2 border-slate-300 p-1 bg-white shadow-[2px_2px_6px_rgba(0,0,0,0.15)] rotate-[1deg]">
          <QRCodeSVG value={qrValue} size={56} />
        </div>
      </div>

      {/* Divider estilo a mano */}
      <div className="border-b-2 border-dashed border-slate-300 my-3" />

      {/* Footer */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={11} />
          <span className="truncate">{activo.ubicacion}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <User size={11} />
          <span>{activo.responsable}</span>
        </div>
        {lastMedicion && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={11} />
            <span>Última medición: {format(parseISO(lastMedicion.fecha), 'dd/MM/yyyy', { locale: es })}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Clock size={11} />
          <span>Prox. mant.: {format(parseISO(activo.proximoMantenimiento), 'dd/MM/yyyy', { locale: es })}</span>
        </div>
      </div>
    </div>
  );
};
