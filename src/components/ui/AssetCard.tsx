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
      className="group bg-surface/70 backdrop-blur-xl border border-line rounded-lg shadow-soft cursor-pointer hover:-translate-y-0.5 hover:shadow-glow hover:border-brand-500/40 transition-all duration-200 ease-premium p-4 relative"
      onClick={() => navigate(`/activos/${activo.id}`)}
    >
      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar activo"
          className="press absolute top-2.5 right-2.5 grid place-items-center w-8 h-8 rounded-full text-faint hover:text-brand-400 hover:bg-subtle transition-colors z-10"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* Header: estado + sector (texto discreto) */}
      <div className="flex justify-between items-center gap-2 mb-2 pr-8">
        <StatusBadge estado={activo.estado} size="sm" />
        <span className="text-xs font-medium text-faint truncate max-w-[45%]" title={sectorNombre}>
          {sectorNombre}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="sm" />
        {activo.esItinerante && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-300">
            <span className="w-1 h-3 rounded-sm bg-brand-500" />
            Itinerante{activo.locacionActual ? ` · ${activo.locacionActual}` : ''}
          </span>
        )}
      </div>

      {/* Foto del activo */}
      {activo.fotoUrl && (
        <div className="mb-3 rounded-md overflow-hidden border border-line">
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
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold text-xl text-content leading-tight">{activo.codigo}</div>
          <div className="font-semibold text-content text-sm mt-0.5 leading-snug">{activo.nombre}</div>
          <div className="text-xs text-muted mt-1">{activo.marca} {activo.modelo}</div>
        </div>
        {/* QR (fondo blanco para escaneo en cualquier tema) */}
        <div className="rounded-md p-1.5 bg-white shadow-soft shrink-0">
          <QRCodeSVG value={qrValue} size={52} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-b border-line my-3" />

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
