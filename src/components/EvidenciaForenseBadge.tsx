/**
 * Badge compacto que muestra la evidencia forense de una foto.
 *
 * Se usa al pie de fotos en mediciones, chat de soporte, ficha publica.
 * Es visualmente discreto pero da en un golpe de vista:
 *   - Donde se sacó (mini link a Google Maps)
 *   - Cuando se sacó (timestamp REAL del EXIF, no del upload)
 *   - Con que dispositivo
 *   - Que tan confiable es (EXIF > navegador)
 */
import React from 'react';
import { MapPin, Camera, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface DatosEvidencia {
  capturedLat?: number | null;
  capturedLng?: number | null;
  capturedAt?: string | null;
  deviceModel?: string | null;
  fuenteUbicacion?: 'exif' | 'browser' | 'manual' | 'ninguna' | string | null;
}

function formatearFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export const EvidenciaForenseBadge: React.FC<{ datos: DatosEvidencia; compacto?: boolean }> = ({ datos, compacto }) => {
  const tieneUbi = datos.capturedLat != null && datos.capturedLng != null;
  const tieneAlgo = tieneUbi || datos.capturedAt || datos.deviceModel;
  if (!tieneAlgo) return null;

  const fuente = datos.fuenteUbicacion ?? 'ninguna';
  const verificado = fuente === 'exif';
  const linkMaps = tieneUbi
    ? `https://www.google.com/maps?q=${datos.capturedLat},${datos.capturedLng}`
    : null;

  return (
    <div className={`border border-line bg-subtle ${compacto ? 'px-2 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'} text-muted space-y-1`}>
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted">
        {verificado ? (
          <>
            <ShieldCheck size={11} className="text-ok-strong dark:text-ok" />
            <span className="text-ok-strong dark:text-ok">Evidencia verificada por EXIF</span>
          </>
        ) : fuente === 'browser' ? (
          <>
            <ShieldAlert size={11} className="text-warn-strong dark:text-warn" />
            <span className="text-warn-strong dark:text-warn">Ubicacion del navegador (no del EXIF)</span>
          </>
        ) : (
          <span>Datos de captura</span>
        )}
      </div>

      {tieneUbi && (
        <div className="flex items-center gap-1.5">
          <MapPin size={12} className="text-faint flex-shrink-0" />
          {linkMaps ? (
            <a href={linkMaps} target="_blank" rel="noopener noreferrer" className="font-mono text-content hover:text-brand-600 underline break-all">
              {datos.capturedLat?.toFixed(5)}, {datos.capturedLng?.toFixed(5)}
            </a>
          ) : (
            <span className="font-mono">{datos.capturedLat?.toFixed(5)}, {datos.capturedLng?.toFixed(5)}</span>
          )}
        </div>
      )}

      {datos.capturedAt && (
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-faint flex-shrink-0" />
          <span>{formatearFecha(datos.capturedAt)}</span>
        </div>
      )}

      {datos.deviceModel && (
        <div className="flex items-center gap-1.5">
          <Camera size={12} className="text-faint flex-shrink-0" />
          <span className="truncate">{datos.deviceModel}</span>
        </div>
      )}
    </div>
  );
};
