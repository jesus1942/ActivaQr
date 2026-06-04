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
  tipo: { nombre: string } | null;
  responsable: { nombre: string; email?: string; telefono?: string } | null;
  mediciones: { temperatura: number; amperaje: number; presion: number; vibracion: number; fecha: string; estado: string }[];
}

const ESTADO_COLORS: Record<string, string> = {
  normal:        'bg-emerald-50 border-emerald-400 text-emerald-700',
  alerta:        'bg-amber-50 border-amber-400 text-amber-700',
  critico:       'bg-red-50 border-red-500 text-red-700',
  mantenimiento: 'bg-blue-50 border-blue-400 text-blue-700',
};

function Fila({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-none">
      <span className="text-xs font-black uppercase tracking-wider text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="font-black uppercase tracking-widest text-slate-500 animate-pulse">Cargando ficha...</p>
      </div>
    );
  }

  if (error || !activo) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] max-w-sm w-full p-6 text-center">
          <p className="font-black text-lg text-slate-800 mb-2">ERROR</p>
          <p className="font-semibold text-slate-700">{error || 'Activo no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const ultimaMedicion = activo.mediciones[0];

  // Si el equipo está en mantenimiento o fuera de servicio, el badge principal lo refleja
  const estadoVisual =
    activo.estadoOperativo === 'mantenimiento' ? 'mantenimiento' :
    activo.estadoOperativo === 'fuera_servicio' ? 'fuera de servicio' :
    activo.estado;
  const estadoColor =
    activo.estadoOperativo === 'mantenimiento' ? 'bg-blue-50 border-blue-400 text-blue-700' :
    activo.estadoOperativo === 'fuera_servicio' ? 'bg-red-50 border-red-400 text-red-700' :
    ESTADO_COLORS[activo.estado] ?? 'bg-slate-50 border-slate-300 text-slate-600';

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Nav bar */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : undefined}
            className="flex items-center gap-1.5 bg-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] px-3 py-2 text-xs font-black uppercase tracking-wider hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1e293b] active:shadow-none transition-all"
          >
            <ArrowLeft size={14} />
            Volver
          </button>
          {usuarioLogueado && (
            <a
              href="#/activos"
              className="flex items-center gap-1.5 bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] px-3 py-2 text-xs font-black uppercase tracking-wider hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1e293b] active:shadow-none transition-all"
            >
              <LayoutDashboard size={14} />
              Panel
            </a>
          )}
        </div>

        {/* Header empresa */}
        <div className="bg-slate-900 text-white px-5 py-4 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] flex items-center gap-3">
          {activo.empresa.logoUrl && (
            <img src={activo.empresa.logoUrl} alt="" className="w-10 h-10 object-contain" />
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-orange-400">ActivaQR</p>
            <p className="font-black text-lg leading-tight">{activo.empresa.nombre}</p>
          </div>
        </div>

        {/* Identidad del activo */}
        <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-orange-500 mb-1">
                {activo.codigo}
              </p>
              <h1 className="font-black text-2xl text-slate-900 leading-tight">{activo.nombre}</h1>
              {activo.tipo && (
                <p className="text-sm text-slate-500 mt-1">{activo.tipo.nombre}</p>
              )}
            </div>
            {activo.estado && (
              <span className={`text-xs font-black uppercase px-2 py-1 border-2 whitespace-nowrap ${estadoColor}`}>
                {estadoVisual}
              </span>
            )}
          </div>

          {/* Estado operativo — visible para el visitante que escanea el QR */}
          {activo.estadoOperativo && (
            <div className="mb-4 -mt-1">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Estado operativo</p>
              <EstadoOperativoBadge estado={activo.estadoOperativo} size="lg" />
            </div>
          )}

          <Fila label="Marca"     value={activo.marca} />
          <Fila label="Modelo"    value={activo.modelo} />
          <Fila label="Sector"    value={activo.sector?.nombre} />
          <Fila label="Ubicación" value={activo.ubicacion} />
          <Fila label="Responsable" value={activo.responsable?.nombre} />
          <Fila label="Tel. responsable" value={activo.responsable?.telefono} />
          <Fila label="Horas actuales" value={activo.horasActuales ? `${activo.horasActuales} hs` : undefined} />
          <Fila label="Fecha ingreso" value={activo.fechaIngreso ? activo.fechaIngreso.slice(0, 10) : undefined} />
          <Fila label="Proximo mant." value={activo.proximoMantenimiento ? activo.proximoMantenimiento.slice(0, 10) : undefined} />
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

        {/* Parámetros operativos */}
        {(activo.temperaturaMin || activo.temperaturaMax || activo.amperajeNormal || activo.presionNormal) ? (
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
            <p className="text-xs font-black uppercase tracking-wider text-orange-500 mb-3">Parámetros operativos</p>
            <Fila label="Temperatura normal" value={`${activo.temperaturaMin}°C – ${activo.temperaturaMax}°C`} />
            <Fila label="Alerta temperatura" value={activo.temperaturaAlerta ? `${activo.temperaturaAlerta}°C` : undefined} />
            <Fila label="Crítica temperatura" value={activo.temperaturaCritica ? `${activo.temperaturaCritica}°C` : undefined} />
            <Fila label="Amperaje normal"    value={activo.amperajeNormal ? `${activo.amperajeNormal} A` : undefined} />
            <Fila label="Presión normal"     value={activo.presionNormal ? `${activo.presionNormal} bar` : undefined} />
          </div>
        ) : null}

        {/* Última medición */}
        {ultimaMedicion && (
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
            <p className="text-xs font-black uppercase tracking-wider text-orange-500 mb-3">
              Última medición — {ultimaMedicion.fecha.slice(0, 10)}
            </p>
            <Fila label="Temperatura" value={ultimaMedicion.temperatura ? `${ultimaMedicion.temperatura}°C` : undefined} />
            <Fila label="Amperaje"    value={ultimaMedicion.amperaje ? `${ultimaMedicion.amperaje} A` : undefined} />
            <Fila label="Presión"     value={ultimaMedicion.presion ? `${ultimaMedicion.presion} bar` : undefined} />
            <Fila label="Vibración"   value={ultimaMedicion.vibracion ? `${ultimaMedicion.vibracion} mm/s` : undefined} />
            <Fila label="Estado"      value={ultimaMedicion.estado} />
          </div>
        )}

        {/* Codigos de error y soluciones — knowledge base por categoria */}
        <FallasActivo activoId={activo.id} publico />

        {/* Notas */}
        {activo.notas && (
          <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
            <p className="text-xs font-black uppercase tracking-wider text-orange-500 mb-2">Notas</p>
            <p className="text-sm text-slate-700 leading-relaxed">{activo.notas}</p>
          </div>
        )}

        {puedeRegistrar && (
          <a
            href={`#/medicion/${activo.id}`}
            className="block w-full min-h-[56px] bg-orange-500 text-white font-black text-center border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] text-base uppercase tracking-wide flex items-center justify-center hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            Registrar medicion
          </a>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Ficha generada por ActivaQR · Solo lectura
        </p>
      </div>
    </div>
  );
};
