import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Plus } from 'lucide-react';
import { analizarTendencia, Direccion, PuntoMedicion, Severidad, ResultadoAnalisis } from '../../utils/analisisPredictivo';

interface MarcadorTarea {
  fecha: Date;
  label: string;
}

interface PanelParametroProps {
  parametro: string;
  unidad: string;
  puntos: PuntoMedicion[];
  alerta?: number | null;
  critico?: number | null;
  direccion: Direccion;
  rangoNormal?: { min: number; max: number };
  marcadores?: MarcadorTarea[];
  onCrearTareaPredictiva?: (texto: string) => void;
}

const COLOR_PARAMETRO: Record<string, string> = {
  Temperatura: '#F97316',
  Amperaje: '#0EA5E9',
  Voltaje: '#8B5CF6',
  Presion: '#10B981',
  Bateria: '#22C55E',
  Toner: '#A855F7',
  Contador: '#64748B',
};

const COLOR_SEVERIDAD: Record<Severidad, { bg: string; border: string; text: string; icon: string; chip: string }> = {
  normal:   { bg: 'bg-ok/10', border: 'border-ok', text: 'text-ok-strong dark:text-ok', icon: 'text-ok-strong dark:text-ok', chip: 'bg-ok/10 text-ok-strong dark:text-ok' },
  observar: { bg: 'bg-sky-50',     border: 'border-sky-400',     text: 'text-sky-700',     icon: 'text-sky-600',     chip: 'bg-sky-100 text-sky-800' },
  alerta:   { bg: 'bg-warn/10',   border: 'border-warn',   text: 'text-warn-strong dark:text-warn',   icon: 'text-warn-strong dark:text-warn',   chip: 'bg-warn/10 text-warn-strong dark:text-warn' },
  critico:  { bg: 'bg-danger/10',     border: 'border-danger',     text: 'text-danger-strong dark:text-danger',     icon: 'text-danger',     chip: 'bg-danger/10 text-danger-strong dark:text-danger' },
};

// Exportado para que AnalisisActivo pueda calcular severidad sin renderizar.
export function analizarParametro(
  parametro: string,
  unidad: string,
  puntos: PuntoMedicion[],
  alerta: number | null | undefined,
  critico: number | null | undefined,
  direccion: Direccion,
): ResultadoAnalisis {
  return analizarTendencia({ puntos, alerta, critico, direccion, unidad, parametro });
}

export const PanelParametro: React.FC<PanelParametroProps> = ({
  parametro, unidad, puntos, alerta, critico, direccion, rangoNormal, marcadores, onCrearTareaPredictiva,
}) => {
  const analisis = analizarParametro(parametro, unidad, puntos, alerta, critico, direccion);
  const colorLinea = COLOR_PARAMETRO[parametro] ?? '#F97316';
  const colorSev = COLOR_SEVERIDAD[analisis.severidad];

  const data = puntos
    .slice()
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .map((p) => ({
      fechaMs: p.fecha.getTime(),
      fecha: format(p.fecha, 'dd/MM/yy', { locale: es }),
      valor: p.valor,
    }));

  const marcadoresConFecha = (marcadores ?? [])
    .filter((m) => m.fecha instanceof Date && !isNaN(m.fecha.getTime()))
    .map((m) => ({ ...m, fechaMs: m.fecha.getTime() }));

  const TendenciaIcon = analisis.tendencia === 'subiendo' ? TrendingUp
                       : analisis.tendencia === 'bajando' ? TrendingDown
                       : Minus;

  return (
    <div className="bg-surface">
      {data.length < 2 ? (
        <p className="text-sm text-muted italic px-3 py-4">
          Se necesitan al menos 2 mediciones para mostrar tendencia. Actual: {data.length}.
        </p>
      ) : (
        <>
          <div className="px-2 sm:px-3 pt-2">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} width={36} />
                <Tooltip
                  contentStyle={{ borderRadius: 0, border: '2px solid #0f172a', fontSize: 12 }}
                  formatter={(v: any) => [`${v}${unidad}`, parametro]}
                />
                {alerta != null && (
                  <ReferenceLine y={alerta} stroke="#F59E0B" strokeDasharray="4 2" />
                )}
                {critico != null && (
                  <ReferenceLine y={critico} stroke="#DC2626" strokeDasharray="4 2" />
                )}
                {rangoNormal && (
                  <>
                    <ReferenceLine y={rangoNormal.min} stroke="#64748B" strokeDasharray="2 4" />
                    <ReferenceLine y={rangoNormal.max} stroke="#64748B" strokeDasharray="2 4" />
                  </>
                )}
                {marcadoresConFecha.map((m, i) => {
                  const punto = data.find((d) => Math.abs(d.fechaMs - m.fechaMs) < 7 * 86400000);
                  if (!punto) return null;
                  return (
                    <ReferenceDot key={i} x={punto.fecha} y={punto.valor} r={5} fill="#1E293B" stroke="#F97316" strokeWidth={2} />
                  );
                })}
                <Line type="monotone" dataKey="valor" stroke={colorLinea} strokeWidth={2.2} dot={{ r: 2.5, stroke: '#1E293B', strokeWidth: 1, fill: colorLinea }} name={parametro} />
              </LineChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-end gap-3 text-[10px] text-muted mt-1 flex-wrap">
              {alerta != null && <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-warn"></span>Alerta {alerta}{unidad}</span>}
              {critico != null && <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-danger"></span>Critico {critico}{unidad}</span>}
              {rangoNormal && <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-slate-500"></span>Rango {rangoNormal.min}-{rangoNormal.max}{unidad}</span>}
              {marcadoresConFecha.length > 0 && <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-slate-900 border border-brand-600"></span>Tarea</span>}
            </div>
          </div>

          <div className={`mx-2 sm:mx-3 mt-2 mb-2 p-2.5 border ${colorSev.border} ${colorSev.bg}`}>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center pt-0.5">
                <TendenciaIcon size={14} className={colorSev.icon} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs sm:text-sm font-bold ${colorSev.text} leading-snug`}>{analisis.resumen}</p>
                {analisis.pendienteMensual != null && Math.abs(analisis.pendienteMensual) > 0.01 && (
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    {analisis.pendienteMensual > 0 ? '+' : ''}{analisis.pendienteMensual.toFixed(2)}{unidad}/mes
                    {analisis.diasHastaAlerta != null && ` · ${analisis.diasHastaAlerta}d hasta alerta`}
                    {analisis.diasHastaCritico != null && ` · ${analisis.diasHastaCritico}d hasta critico`}
                    {` · confianza ${analisis.confianza}`}
                  </p>
                )}
                {!analisis.prediccionDisponible && (
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    Predicción no disponible · se requieren al menos 5 mediciones distribuidas en 7 días y una tendencia consistente.
                  </p>
                )}
                {analisis.recomendacion && (
                  <div className="mt-2">
                    <p className="text-[11px] sm:text-xs text-content italic leading-snug">
                      {analisis.recomendacion}
                    </p>
                    {onCrearTareaPredictiva && (
                      <button
                        onClick={() => onCrearTareaPredictiva(analisis.recomendacion!)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1.5 border border-line shadow-soft active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <Plus size={12} /> Crear tarea predictiva
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Resumen visible incluso cuando el panel esta colapsado
export const ResumenParametro: React.FC<{
  parametro: string;
  unidad: string;
  puntos: PuntoMedicion[];
  alerta?: number | null;
  critico?: number | null;
  direccion: Direccion;
}> = ({ parametro, unidad, puntos, alerta, critico, direccion }) => {
  const analisis = analizarParametro(parametro, unidad, puntos, alerta, critico, direccion);
  const colorSev = COLOR_SEVERIDAD[analisis.severidad];
  const TendenciaIcon = analisis.tendencia === 'subiendo' ? TrendingUp
                       : analisis.tendencia === 'bajando' ? TrendingDown
                       : Minus;
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <span className="text-xs sm:text-sm font-black uppercase tracking-wide text-content truncate">{parametro}</span>
      {analisis.ultimoValor != null && (
        <span className="text-xs sm:text-sm font-mono font-bold text-content flex-shrink-0">
          {analisis.ultimoValor.toFixed(1)}{unidad}
        </span>
      )}
      {analisis.tendencia && analisis.tendencia !== 'estable' && (
        <TendenciaIcon size={12} className={colorSev.icon} />
      )}
      {analisis.severidad !== 'normal' && (
        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${colorSev.chip} flex-shrink-0`}>
          {analisis.severidad === 'observar' ? 'obs' : analisis.severidad}
          {analisis.severidad !== 'observar' && analisis.diasHastaCritico != null && ` ${analisis.diasHastaCritico}d`}
        </span>
      )}
    </div>
  );
};

export function severidadDeParametro(
  puntos: PuntoMedicion[],
  alerta: number | null | undefined,
  critico: number | null | undefined,
  direccion: Direccion,
  parametro: string,
  unidad: string,
): Severidad {
  return analizarParametro(parametro, unidad, puntos, alerta, critico, direccion).severidad;
}
