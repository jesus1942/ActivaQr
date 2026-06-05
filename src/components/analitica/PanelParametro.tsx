import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Plus } from 'lucide-react';
import { analizarTendencia, Direccion, PuntoMedicion, Severidad } from '../../utils/analisisPredictivo';

interface MarcadorTarea {
  fecha: Date;
  label: string; // ej "Correctivo: cambio termostato"
}

interface PanelParametroProps {
  parametro: string; // "Temperatura", "Bateria", etc.
  unidad: string;    // "°C", "%", "A", "bar", "V"
  puntos: PuntoMedicion[];
  alerta?: number | null;
  critico?: number | null;
  direccion: Direccion;
  // Para voltaje: tambien hay un min/max "normal" que no son alertas
  rangoNormal?: { min: number; max: number };
  // Tareas marcadas en el gráfico (correctivos, preventivos cerrados)
  marcadores?: MarcadorTarea[];
  // Callback para crear tarea predictiva con la recomendacion
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

const COLOR_SEVERIDAD: Record<Severidad, { bg: string; border: string; text: string; icon: string }> = {
  normal:   { bg: 'bg-emerald-50',  border: 'border-emerald-400', text: 'text-emerald-700', icon: 'text-emerald-600' },
  observar: { bg: 'bg-sky-50',      border: 'border-sky-400',     text: 'text-sky-700',     icon: 'text-sky-600' },
  alerta:   { bg: 'bg-amber-50',    border: 'border-amber-400',   text: 'text-amber-700',   icon: 'text-amber-600' },
  critico:  { bg: 'bg-red-50',      border: 'border-red-400',     text: 'text-red-700',     icon: 'text-red-600' },
};

export const PanelParametro: React.FC<PanelParametroProps> = ({
  parametro,
  unidad,
  puntos,
  alerta,
  critico,
  direccion,
  rangoNormal,
  marcadores,
  onCrearTareaPredictiva,
}) => {
  const analisis = analizarTendencia({ puntos, alerta, critico, direccion, unidad, parametro });
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

  // Detectar tareas para marcar como puntos verticales en el grafico:
  // las pasamos como ReferenceLine usando el ms timestamp de su fecha.
  const marcadoresConFecha = (marcadores ?? [])
    .filter((m) => m.fecha instanceof Date && !isNaN(m.fecha.getTime()))
    .map((m) => ({ ...m, fechaMs: m.fecha.getTime(), label: m.label }));

  const TendenciaIcon = analisis.tendencia === 'subiendo' ? TrendingUp
                       : analisis.tendencia === 'bajando' ? TrendingDown
                       : Minus;

  return (
    <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">{parametro}</h3>
        <div className="flex items-center gap-2">
          {analisis.tendencia && (
            <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 border-2 ${colorSev.border} ${colorSev.bg} ${colorSev.text}`}>
              <TendenciaIcon size={12} /> {analisis.tendencia}
            </span>
          )}
          {analisis.severidad !== 'normal' && (
            <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 border-2 ${colorSev.border} ${colorSev.bg} ${colorSev.text}`}>
              <AlertTriangle size={12} />
              {analisis.severidad}
            </span>
          )}
        </div>
      </div>

      {data.length < 2 ? (
        <p className="text-sm text-slate-500 italic">
          Se necesitan al menos 2 mediciones para mostrar tendencia. Actual: {data.length}.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ borderRadius: 0, border: '2px solid #0f172a' }}
                formatter={(v: any) => [`${v}${unidad}`, parametro]}
              />
              {alerta != null && (
                <ReferenceLine y={alerta} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: `Alerta ${alerta}${unidad}`, fontSize: 10, fill: '#B45309', position: 'right' }} />
              )}
              {critico != null && (
                <ReferenceLine y={critico} stroke="#DC2626" strokeDasharray="4 2" label={{ value: `Critico ${critico}${unidad}`, fontSize: 10, fill: '#991B1B', position: 'right' }} />
              )}
              {rangoNormal && (
                <>
                  <ReferenceLine y={rangoNormal.min} stroke="#64748B" strokeDasharray="2 4" label={{ value: `Min ${rangoNormal.min}${unidad}`, fontSize: 9, fill: '#64748B', position: 'left' }} />
                  <ReferenceLine y={rangoNormal.max} stroke="#64748B" strokeDasharray="2 4" label={{ value: `Max ${rangoNormal.max}${unidad}`, fontSize: 9, fill: '#64748B', position: 'left' }} />
                </>
              )}
              {marcadoresConFecha.map((m, i) => {
                // Encontrar el punto de data mas cercano al ms del marcador
                const punto = data.find((d) => Math.abs(d.fechaMs - m.fechaMs) < 7 * 86400000);
                if (!punto) return null;
                return (
                  <ReferenceDot key={i} x={punto.fecha} y={punto.valor} r={6} fill="#1E293B" stroke="#F97316" strokeWidth={2} />
                );
              })}
              <Line type="monotone" dataKey="valor" stroke={colorLinea} strokeWidth={2.5} dot={{ r: 3, stroke: '#1E293B', strokeWidth: 1, fill: colorLinea }} name={parametro} />
            </LineChart>
          </ResponsiveContainer>

          <div className={`mt-3 p-3 border-2 ${colorSev.border} ${colorSev.bg}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className={`${colorSev.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${colorSev.text}`}>{analisis.resumen}</p>
                {analisis.pendienteMensual != null && Math.abs(analisis.pendienteMensual) > 0.01 && (
                  <p className="text-xs text-slate-600 mt-1">
                    Pendiente: {analisis.pendienteMensual > 0 ? '+' : ''}{analisis.pendienteMensual.toFixed(2)}{unidad}/mes
                    {analisis.diasHastaAlerta != null && ` · ${analisis.diasHastaAlerta} dias hasta alerta`}
                    {analisis.diasHastaCritico != null && ` · ${analisis.diasHastaCritico} dias hasta critico`}
                  </p>
                )}
                {analisis.recomendacion && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-700 italic flex-1 min-w-[200px]">
                      Recomendacion: {analisis.recomendacion}
                    </span>
                    {onCrearTareaPredictiva && (
                      <button
                        onClick={() => onCrearTareaPredictiva(analisis.recomendacion!)}
                        className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1.5 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                      >
                        <Plus size={12} /> Tarea predictiva
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
