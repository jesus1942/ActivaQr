// v1.1.0
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, getToken, getUsuario } from '../data/auth';
import { EstadoOperativoBadge } from '../components/ui/EstadoOperativoBadge';
import { FallasActivo } from '../components/FallasActivo';
import { EstadoOperativo } from '../data/types';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

interface FichaActivo {
  id: string;
  codigo: string;
  nombre: string;
  marca: string;
  modelo: string;
  ubicacion: string;
  estado: string;
  estadoOperativo?: EstadoOperativo;
  fechaIngreso: string;
  proximoMantenimiento: string;
  horasActuales: number;
  kilometrosActuales?: number;
  estrategiaMantenimiento?: 'horas' | 'kilometros' | 'fecha';
  proximoMantenimientoLectura?: number | null;
  temperaturaMin: number;
  temperaturaMax: number;
  temperaturaAlerta: number;
  temperaturaCritica: number;
  amperajeNormal: number;
  presionNormal: number;
  notas: string;
  esItinerante?: boolean;
  locacionBase?: string | null;
  locacionActual?: string | null;
  fechaSalida?: string | null;
  fechaRetorno?: string | null;
  empresa: { id: string; nombre: string; logoUrl?: string | null };
  sector: { nombre: string } | null;
  tipo: {
    nombre: string;
    mideTemperatura?: boolean;
    mideAmperaje?: boolean;
    midePresion?: boolean;
    mideVibracion?: boolean;
  } | null;
  responsable: { nombre: string; email?: string; telefono?: string } | null;
  mediciones: { temperatura: number; amperaje: number; presion: number; vibracion: number; fecha: string; estado: string }[];
}

const ESTADO_COLORS: Record<string, string> = {
  normal:        'bg-ok/10 border-ok text-ok-strong dark:text-ok',
  alerta:        'bg-warn/10 border-warn text-warn-strong dark:text-warn',
  critico:       'bg-danger/10 border-danger text-danger-strong dark:text-danger',
  mantenimiento: 'bg-brand-50 dark:bg-brand-600/15 border-brand-600 text-brand-700 dark:text-brand-300',
};

function Fila({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-line last:border-none">
      <span className="text-xs font-black uppercase tracking-wider text-muted shrink-0">{label}</span>
      <span className="text-sm font-semibold text-content text-right">{value}</span>
    </div>
  );
}

export const FichaPublica: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activo, setActivo] = useState<FichaActivo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const visitaRegistrada = useRef(false);

  // Detectar si hay un usuario logueado que pertenece a la misma empresa
  const usuarioLogueado = getToken() ? getUsuario() : null;
  const puedeRegistrar = !!(
    usuarioLogueado &&
    activo &&
    (usuarioLogueado.rol === 'operador' || usuarioLogueado.rol === 'admin') &&
    usuarioLogueado.empresaId === activo.empresa.id
  );

  useEffect(() => {
    if (!id || !API_URL) return;
    fetch(`${API_URL}/public/activos/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else {
          setActivo(data);
          // Registrar visita a la ficha (una sola vez por montaje, fire-and-forget).
          if (!visitaRegistrada.current) {
            visitaRegistrada.current = true;
            fetch(`${API_URL}/visitas`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tipo: 'ficha', activoId: id }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => setError('No se pudo cargar la ficha del activo.'))
      .finally(() => setCargando(false));
  }, [id]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center">
        <p className="font-black uppercase tracking-widest text-muted animate-pulse">Cargando ficha...</p>
      </div>
    );
  }

  if (error || !activo) {
    return (
      <div className="min-h-screen bg-subtle flex items-center justify-center p-4">
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft max-w-sm w-full p-6 text-center">
          <p className="font-black text-lg text-content mb-2">ERROR</p>
          <p className="font-semibold text-content">{error || 'Activo no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const ultimaMedicion = activo.mediciones[0];

  // Si el tipo viene con flags, respeta. Si no viene tipo, fallback
  // legacy: asume que mide todo (compatibilidad con seed local sin tipo).
  const mide = {
    temp:      activo.tipo?.mideTemperatura ?? !activo.tipo,
    amp:       activo.tipo?.mideAmperaje ?? !activo.tipo,
    presion:   activo.tipo?.midePresion ?? !activo.tipo,
    vibracion: activo.tipo?.mideVibracion ?? !activo.tipo,
  };
  const llevaHoras = mide.temp || mide.amp || mide.presion || mide.vibracion;
  // Solo mostramos la tarjeta de parámetros si el tipo los mide Y hay al menos
  // un valor cargado (evita tarjetas vacías o filas con "null").
  const tieneParametros =
    (mide.temp && (
      (activo.temperaturaMin != null && activo.temperaturaMax != null) ||
      activo.temperaturaAlerta != null ||
      activo.temperaturaCritica != null
    )) ||
    (mide.amp && activo.amperajeNormal != null) ||
    (mide.presion && activo.presionNormal != null);

  // Si el equipo está en mantenimiento o fuera de servicio, el badge principal lo refleja
  const estadoVisual =
    activo.estadoOperativo === 'mantenimiento' ? 'mantenimiento' :
    activo.estadoOperativo === 'fuera_servicio' ? 'fuera de servicio' :
    activo.estado;
  const estadoColor =
    activo.estadoOperativo === 'mantenimiento' ? 'bg-brand-50 dark:bg-brand-600/15 border-brand-600 text-brand-700 dark:text-brand-300' :
    activo.estadoOperativo === 'fuera_servicio' ? 'bg-danger/10 border-danger text-danger-strong dark:text-danger' :
    ESTADO_COLORS[activo.estado] ?? 'bg-subtle border-line text-muted';

  return (
    <div className="min-h-screen bg-subtle py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Nav bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : undefined}
            className="flex items-center gap-1.5 bg-surface/85 backdrop-blur-xl border border-line shadow-soft px-3 py-2 text-xs font-black uppercase tracking-wider hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-soft active:shadow-none transition-all"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          {usuarioLogueado && (
            <a
              href="#/activos"
              className="flex items-center gap-1.5 bg-slate-900 text-white border border-line shadow-soft px-3 py-2 text-xs font-black uppercase tracking-wider hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-soft active:shadow-none transition-all"
            >
              <LayoutDashboard size={14} />
              Panel
            </a>
          )}
        </div>

        {/* Header empresa */}
        <div className="bg-slate-900 text-white px-5 py-4 border border-line shadow-soft flex items-center gap-3">
          {activo.empresa.logoUrl && (
            <img src={activo.empresa.logoUrl} alt="" className="w-10 h-10 object-contain" />
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-brand-400">ActivaQR</p>
            <p className="font-black text-lg leading-tight">{activo.empresa.nombre}</p>
          </div>
        </div>

        {/* Identidad del activo */}
        <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-1">
                {activo.codigo}
              </p>
              <h1 className="font-black text-2xl text-content leading-tight">{activo.nombre}</h1>
              {activo.tipo && (
                <p className="text-sm text-muted mt-1">{activo.tipo.nombre}</p>
              )}
            </div>
            {activo.estado && (
              <span className={`text-xs font-black uppercase px-2 py-1 border whitespace-nowrap ${estadoColor}`}>
                {estadoVisual}
              </span>
            )}
          </div>

          {/* Estado operativo — visible para el visitante que escanea el QR */}
          {activo.estadoOperativo && (
            <div className="mb-4 -mt-1">
              <p className="text-xs font-black uppercase tracking-wider text-muted mb-1.5">Estado operativo</p>
              <EstadoOperativoBadge estado={activo.estadoOperativo} size="lg" />
            </div>
          )}

          <Fila label="Marca"     value={activo.marca} />
          <Fila label="Modelo"    value={activo.modelo} />
          <Fila label="Sector"    value={activo.sector?.nombre} />
          <Fila label="Ubicación" value={activo.ubicacion} />
          <Fila label="Responsable" value={activo.responsable?.nombre} />
          <Fila label="Tel. responsable" value={activo.responsable?.telefono} />
          <Fila label="Horas actuales" value={llevaHoras && activo.horasActuales ? `${activo.horasActuales} hs` : undefined} />
          <Fila
            label="Kilometraje actual"
            value={activo.estrategiaMantenimiento === 'kilometros'
              ? `${(activo.kilometrosActuales ?? 0).toLocaleString('es-AR')} km`
              : undefined}
          />
          <Fila label="Fecha ingreso" value={activo.fechaIngreso ? activo.fechaIngreso.slice(0, 10) : undefined} />
          <Fila
            label="Próximo mant."
            value={activo.estrategiaMantenimiento === 'horas'
              ? `${activo.proximoMantenimientoLectura?.toLocaleString('es-AR') ?? '—'} h`
              : activo.estrategiaMantenimiento === 'kilometros'
                ? `${activo.proximoMantenimientoLectura?.toLocaleString('es-AR') ?? '—'} km`
                : activo.proximoMantenimiento?.slice(0, 10)}
          />
          {activo.esItinerante && (
            <>
              <Fila label="Tipo" value="Itinerante" />
              <Fila label="Locacion base" value={activo.locacionBase ?? undefined} />
              <Fila label="Locacion actual" value={activo.locacionActual ?? undefined} />
              <Fila label="Fecha salida" value={activo.fechaSalida ? activo.fechaSalida.slice(0, 10) : undefined} />
              <Fila label="Fecha retorno est." value={activo.fechaRetorno ? activo.fechaRetorno.slice(0, 10) : undefined} />
            </>
          )}
        </div>

        {/* Parámetros operativos — solo si el tipo los mide */}
        {tieneParametros && (
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
            <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-3">Parámetros operativos</p>
            {mide.temp && (
              <>
                <Fila
                  label="Temperatura normal"
                  value={
                    activo.temperaturaMin != null && activo.temperaturaMax != null
                      ? `${activo.temperaturaMin}°C – ${activo.temperaturaMax}°C`
                      : undefined
                  }
                />
                <Fila label="Alerta temperatura" value={activo.temperaturaAlerta ? `${activo.temperaturaAlerta}°C` : undefined} />
                <Fila label="Crítica temperatura" value={activo.temperaturaCritica ? `${activo.temperaturaCritica}°C` : undefined} />
              </>
            )}
            {mide.amp && <Fila label="Amperaje normal" value={activo.amperajeNormal ? `${activo.amperajeNormal} A` : undefined} />}
            {mide.presion && <Fila label="Presión normal" value={activo.presionNormal ? `${activo.presionNormal} bar` : undefined} />}
          </div>
        )}

        {/* Última medición — solo si tiene mediciones que mostrar segun el tipo */}
        {ultimaMedicion && (mide.temp || mide.amp || mide.presion || mide.vibracion) && (
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
            <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-3">
              Última medición — {ultimaMedicion.fecha.slice(0, 10)}
            </p>
            {mide.temp      && <Fila label="Temperatura" value={ultimaMedicion.temperatura ? `${ultimaMedicion.temperatura}°C` : undefined} />}
            {mide.amp       && <Fila label="Amperaje"    value={ultimaMedicion.amperaje ? `${ultimaMedicion.amperaje} A` : undefined} />}
            {mide.presion   && <Fila label="Presión"     value={ultimaMedicion.presion ? `${ultimaMedicion.presion} bar` : undefined} />}
            {mide.vibracion && <Fila label="Vibración"   value={ultimaMedicion.vibracion ? `${ultimaMedicion.vibracion} mm/s` : undefined} />}
            <Fila label="Estado" value={ultimaMedicion.estado} />
          </div>
        )}

        {/* Codigos de error y soluciones — knowledge base por categoria */}
        <FallasActivo activoId={activo.id} publico />

        {/* Notas */}
        {activo.notas && (
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-5">
            <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-2">Notas</p>
            <p className="text-sm text-content leading-relaxed">{activo.notas}</p>
          </div>
        )}

        {puedeRegistrar && (
          <a
            href={`#/medicion/${activo.id}`}
            className="block w-full min-h-[56px] bg-brand-600 text-white font-black text-center border border-line shadow-soft text-base uppercase tracking-wide flex items-center justify-center hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            Registrar medicion
          </a>
        )}

        <p className="text-center text-xs text-faint pb-4">
          Ficha generada por ActivaQR · Solo lectura
        </p>
      </div>
    </div>
  );
};
