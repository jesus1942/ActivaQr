/**
 * Lista cronologica de ubicaciones conocidas de un activo + mini mapa OSM
 * embebido apuntando al ultimo punto.
 *
 * Tipico caso de uso: activo itinerante que dejo de aparecer, hay que ver
 * donde se vio por ultima vez. Tambien sirve para auditoria y traslados.
 */
import React, { useEffect, useState } from 'react';
import { MapPin, Clock, Camera, ShieldCheck, ShieldAlert, FileText, FileDown } from 'lucide-react';
import { apiFetch } from '../data/auth';
import { exportarCadenaCustodiaPdf } from '../utils/exportPdf';

interface Punto {
  id: string;
  origen: 'medicion' | 'mensaje_remoto';
  lat: number;
  lng: number;
  capturedAt: string | null;
  subidoEn: string;
  fuente: string | null;
  device: string | null;
  descripcion: string | null;
  autor: string | null;
}

interface RespuestaUbicaciones {
  activo: { id: string; codigo: string; nombre: string };
  puntos: Punto[];
  ultimaUbicacion: Punto | null;
}

function formatearFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export const UbicacionesActivo: React.FC<{ activoId: string }> = ({ activoId }) => {
  const [datos, setDatos] = useState<RespuestaUbicaciones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch(`activos/${activoId}/ubicaciones`)
      .then(r => r.json())
      .then((d: RespuestaUbicaciones) => setDatos(d))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [activoId]);

  if (cargando) {
    return (
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4">
        <p className="text-sm text-faint animate-pulse text-center">Cargando ubicaciones...</p>
      </div>
    );
  }
  if (error) return null;
  if (!datos || datos.puntos.length === 0) return null;

  const ultima = datos.ultimaUbicacion!;
  const delta = 0.005; // ~500 m alrededor
  const bbox = `${ultima.lng - delta}%2C${ultima.lat - delta}%2C${ultima.lng + delta}%2C${ultima.lat + delta}`;
  const marker = `${ultima.lat}%2C${ultima.lng}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  const linkGoogleMaps = `https://www.google.com/maps?q=${ultima.lat},${ultima.lng}`;

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft">
      <div className="border border-line px-4 py-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-content flex items-center gap-2">
            <MapPin size={14} className="text-brand-600" /> Cadena de custodia: ubicaciones registradas
          </h2>
          <p className="text-xs text-muted mt-0.5">{datos.puntos.length} punto{datos.puntos.length === 1 ? '' : 's'} con GPS</p>
        </div>
        <button
          onClick={() => exportarCadenaCustodiaPdf({
            activoCodigo: datos.activo.codigo,
            activoNombre: datos.activo.nombre,
            puntos: datos.puntos,
          })}
          className="flex items-center gap-1 border border-line hover:border-brand-600 hover:text-brand-600 px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors"
          title="Exportar reporte PDF de cadena de custodia"
        >
          <FileDown size={12} /> PDF
        </button>
      </div>

      {/* Mapa de la ultima ubicacion */}
      <div className="border border-line bg-subtle">
        <iframe
          title="Ultima ubicacion en OpenStreetMap"
          src={iframeSrc}
          style={{ border: 0, width: '100%', height: '260px', display: 'block' }}
          loading="lazy"
        />
        <div className="px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-content">Ultima ubicacion: {formatearFecha(ultima.capturedAt ?? ultima.subidoEn)}</span>
          <a href={linkGoogleMaps} target="_blank" rel="noopener noreferrer" className="text-brand-600 font-bold hover:underline">Abrir en Google Maps</a>
        </div>
      </div>

      {/* Lista cronologica */}
      <div className="max-h-80 overflow-y-auto divide-y-2 divide-slate-100">
        {datos.puntos.map((p, i) => {
          const fechaReal = p.capturedAt ?? p.subidoEn;
          const verificado = p.fuente === 'exif';
          return (
            <div key={p.id} className="px-4 py-2.5 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-content flex items-center gap-1.5">
                  <Clock size={11} className="text-faint" />
                  {formatearFecha(fechaReal)}
                </span>
                {i === 0 && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white px-1.5 py-0.5">Mas reciente</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={11} className="text-faint" />
                <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="font-mono text-content hover:text-brand-600 underline">
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                </a>
                {verificado ? (
                  <span className="ml-auto flex items-center gap-0.5 text-ok-strong dark:text-ok text-[10px] font-black uppercase">
                    <ShieldCheck size={10} /> EXIF
                  </span>
                ) : (
                  <span className="ml-auto flex items-center gap-0.5 text-warn-strong dark:text-warn text-[10px] font-black uppercase">
                    <ShieldAlert size={10} /> Navegador
                  </span>
                )}
              </div>
              {p.device && (
                <div className="flex items-center gap-1.5 text-muted">
                  <Camera size={11} />
                  <span className="truncate">{p.device}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted">
                <FileText size={11} />
                <span className="truncate">
                  {p.origen === 'medicion' ? 'Medicion' : 'Mensaje de soporte'}
                  {p.autor ? ` por ${p.autor}` : ''}
                  {p.descripcion ? ` — ${p.descripcion.slice(0, 60)}${p.descripcion.length > 60 ? '...' : ''}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
