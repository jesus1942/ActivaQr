// v1.1.0
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activo, Medicion } from '../../data/types';
import { StatusBadge } from './StatusBadge';
import { EstadoOperativoBadge } from './EstadoOperativoBadge';
import { Badge } from './Badge';
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
    <article
      className="group bg-surface border border-line rounded-lg shadow-soft cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:border-line-strong transition-all duration-200 ease-premium p-4 relative"
      onClick={() => navigate(`/activos/${activo.id}`)}
    >
      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="Editar activo"
          className="press absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full border border-line bg-surface text-faint hover:text-brand-600 hover:border-brand-600 transition-colors z-10"
        >
          <Pencil size={14} />
        </button>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <StatusBadge estado={activo.estado} size="sm" />
        <Badge className="mr-8 max-w-[46%] truncate">{sectorNombre}</Badge>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <EstadoOperativoBadge estado={activo.estadoOperativo ?? 'operativo'} size="sm" />
        {activo.esItinerante && (
          <div className="flex items-center gap-1.5">
            <Badge tone="brand">Itinerante</Badge>
            {activo.locacionActual && (
              <span className="text-xs text-brand-600 dark:text-brand-300">En: {activo.locacionActual}</span>
            )}
          </div>
        )}
      </div>

      {/* Code & Name */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <div className="font-display font-bold text-2xl text-content leading-tight">{activo.codigo}</div>
          <div className="font-semibold text-muted text-sm mt-0.5 leading-snug">{activo.nombre}</div>
          <div className="text-xs text-faint mt-1">{activo.marca} {activo.modelo}</div>
        </div>
        <div className="border border-line p-1 bg-white rounded-md shadow-xs shrink-0">
          <QRCodeSVG value={qrValue} size={56} />
        </div>
      </div>

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
            <span>Última medición: {format(parseISO(lastMedicion.fecha), 'dd/MM/yyyy', { locale: es })}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-content">
          <Clock size={11} />
          <span>Prox. mant.: {format(parseISO(activo.proximoMantenimiento), 'dd/MM/yyyy', { locale: es })}</span>
        </div>
      </div>
    </article>
  );
};
