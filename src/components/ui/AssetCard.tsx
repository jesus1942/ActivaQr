// v1.1.0
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

// Defensivo: si la fecha viene null/invalida no rompe la card entera.
function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  try {
    const d = parseISO(String(fecha));
    if (isNaN(d.getTime())) return '—';
    return format(d, 'dd/MM/yyyy', { locale: es });
  } catch {
    return '—';
  }
}
import { Activo, Medicion } from '../../data/types';
import { StatusBadge } from './StatusBadge';
import { EstadoOperativoBadge } from './EstadoOperativoBadge';
import { MapPin, Clock, User, Pencil } from 'lucide-react';

interface AssetCardProps {
  activo: Activo;
  lastMedicion?: Medicion;
  sectorNombre: string;
  responsableNombre: string;
  onEdit?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ activo, lastMedicion, sectorNombre, responsableNombre, onEdit }) => {
  const navigate = useNavigate();
  const qrValue = `${window.location.origin}${import.meta.env.BASE_URL}#/ficha/${activo.id}`;

  return (
    <div
      className="bg-surface border border-line shadow-soft cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all duration-150 p-4 relative"
      onClick={() => navigate(`/activos/${activo.id}`)}
    >
      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar activo"
          className="absolute top-2 right-2 border border-line p-1 hover:border-brand-600 hover:text-brand-600 transition-colors bg-surface z-10"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <StatusBadge estado={activo.estado} size="sm" />
        <span className="font-display text-base font-bold uppercase bg-subtle border border-line px-2 py-0.5 text-muted rotate-[1deg] mr-6">
          {sectorNombre}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="sm" />
        {activo.esItinerante && (
          <div className="flex items-center gap-1.5">
            <span className="border border-brand-600 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-600/15 text-xs font-black uppercase px-1.5 py-0.5">ITINERANTE</span>
            {activo.locacionActual && (
              <span className="text-xs text-brand-700 dark:text-brand-300">En: {activo.locacionActual}</span>
            )}
          </div>
        )}
      </div>

      {/* Foto del activo, como pegada en el legajo */}
      {activo.fotoUrl && (
        <div className="mb-3 border border-line bg-surface p-1 shadow-soft rotate-[-0.5deg]">
          <img
            src={activo.fotoUrl}
            alt={activo.nombre}
            loading="lazy"
            className="w-full h-32 object-cover block"
          />
        </div>
      )}

      {/* Code & Name */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <div className="font-display font-black text-2xl text-content leading-tight">{activo.codigo}</div>
          <div className="font-semibold text-content text-sm mt-0.5 leading-snug">{activo.nombre}</div>
          <div className="text-xs text-muted mt-1">{activo.marca} {activo.modelo}</div>
        </div>
        {/* QR como pegado con cinta */}
        <div className="border border-line p-1 bg-surface shadow-soft rotate-[1deg]">
          <QRCodeSVG value={qrValue} size={56} />
        </div>
      </div>

      {/* Divider estilo a mano */}
      <div className="border-b border-dashed border-line my-3" />

      {/* Footer */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={11} />
          <span className="truncate">{activo.ubicacion}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <User size={11} />
          <span>{responsableNombre}</span>
        </div>
        {lastMedicion && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock size={11} />
            <span>Última medición: {fmtFecha(lastMedicion.fecha)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Clock size={11} />
          <span>Prox. mant.: {fmtFecha(activo.proximoMantenimiento)}</span>
        </div>
      </div>
    </div>
  );
};
