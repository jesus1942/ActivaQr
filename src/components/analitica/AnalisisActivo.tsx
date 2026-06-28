import React, { useState, useMemo } from 'react';
import { LineChart as LineChartIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { PanelParametro, ResumenParametro, severidadDeParametro } from './PanelParametro';
import { Direccion, PuntoMedicion, Severidad } from '../../utils/analisisPredictivo';
import { Activo, Medicion, TareaMantenimiento, TipoActivo } from '../../data/types';

interface AnalisisActivoProps {
  activo: Activo;
  tipo: TipoActivo | undefined;
  mediciones: Medicion[];
  tareas: TareaMantenimiento[];
  onCrearTareaPredictiva?: (texto: string) => void;
}

const RANGOS = [
  { label: '1m', dias: 30 },
  { label: '3m', dias: 90 },
  { label: '6m', dias: 180 },
  { label: '12m', dias: 365 },
  { label: '18m', dias: 548 },
  { label: 'Todo', dias: 100000 },
];

interface ParametroConfig {
  key: string;
  parametro: string;
  unidad: string;
  direccion: Direccion;
  habilitado: boolean;
  puntos: PuntoMedicion[];
  alerta?: number | null;
  critico?: number | null;
  rangoNormal?: { min: number; max: number };
}

const SEVERIDAD_PESO: Record<Severidad, number> = { critico: 3, alerta: 2, observar: 1, normal: 0 };

export const AnalisisActivo: React.FC<AnalisisActivoProps> = ({
  activo, tipo, mediciones, tareas, onCrearTareaPredictiva,
}) => {
  const [rangoDias, setRangoDias] = useState<number>(180);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [usuarioToco, setUsuarioToco] = useState(false);

  const medicionesFiltradas = useMemo(() => {
    const limite = Date.now() - rangoDias * 86400000;
    return mediciones
      .filter((m) => m.activoId === activo.id)
      .map((m) => ({ ...m, _ts: new Date(m.fecha).getTime() }))
      .filter((m) => !isNaN(m._ts) && m._ts >= limite)
      .sort((a, b) => a._ts - b._ts);
  }, [mediciones, activo.id, rangoDias]);

  const tareasParaMarcar = useMemo(() => {
    const limite = Date.now() - rangoDias * 86400000;
    return tareas
      .filter((t) => t.activoId === activo.id && t.fechaRealizada)
      .map((t) => {
        const fecha = t.fechaRealizada ? new Date(t.fechaRealizada) : null;
        if (!fecha || isNaN(fecha.getTime()) || fecha.getTime() < limite) return null;
        return { fecha, label: `${t.tipo}: ${(t.observaciones ?? '').slice(0, 60)}` };
      })
      .filter((x): x is { fecha: Date; label: string } => x !== null);
  }, [tareas, activo.id, rangoDias]);

  const params: ParametroConfig[] = useMemo(() => ([
    {
      key: 'temperatura', parametro: 'Temperatura', unidad: '°C', direccion: 'creciente' as Direccion,
      habilitado: tipo?.mideTemperatura ?? false,
      puntos: medicionesFiltradas.filter((m) => m.temperatura != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.temperatura as number })),
      alerta: activo.temperaturaAlerta, critico: activo.temperaturaCritica,
    },
    {
      key: 'amperaje', parametro: 'Amperaje', unidad: 'A', direccion: 'creciente' as Direccion,
      habilitado: tipo?.mideAmperaje ?? false,
      puntos: medicionesFiltradas.filter((m) => m.amperaje != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.amperaje as number })),
      alerta: activo.amperajeAlerta, critico: activo.amperajeCritico,
    },
    {
      key: 'voltaje', parametro: 'Voltaje', unidad: 'V', direccion: 'creciente' as Direccion,
      habilitado: tipo?.mideVoltaje ?? false,
      puntos: medicionesFiltradas.filter((m) => (m as any).voltaje != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).voltaje as number })),
      alerta: activo.voltajeAlerta,
      rangoNormal: activo.voltajeMin != null && activo.voltajeMax != null ? { min: activo.voltajeMin, max: activo.voltajeMax } : undefined,
    },
    {
      key: 'presion', parametro: 'Presion', unidad: 'bar', direccion: 'creciente' as Direccion,
      habilitado: tipo?.midePresion ?? false,
      puntos: medicionesFiltradas.filter((m) => m.presion != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.presion as number })),
      alerta: activo.presionAlerta, critico: activo.presionCritica,
    },
    {
      key: 'bateria', parametro: 'Bateria', unidad: '%', direccion: 'decreciente' as Direccion,
      habilitado: tipo?.mideBateria ?? false,
      puntos: medicionesFiltradas.filter((m) => (m as any).porcentajeBateria != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).porcentajeBateria as number })),
      alerta: activo.bateriaAlerta, critico: activo.bateriaCritica,
    },
    {
      key: 'toner', parametro: 'Toner', unidad: '%', direccion: 'decreciente' as Direccion,
      habilitado: tipo?.mideToner ?? false,
      puntos: medicionesFiltradas.filter((m) => (m as any).nivelToner != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).nivelToner as number })),
      alerta: activo.tonerAlerta, critico: activo.tonerCritico,
    },
    {
      key: 'contador', parametro: 'Contador', unidad: '', direccion: 'creciente' as Direccion,
      habilitado: tipo?.mideContador ?? false,
      puntos: medicionesFiltradas.filter((m) => (m as any).contador != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).contador as number })),
      alerta: activo.intervaloMedicionHoras ? activo.horasActuales + activo.intervaloMedicionHoras : null,
      critico: activo.intervaloMedicionHoras ? activo.horasActuales + activo.intervaloMedicionHoras * 1.2 : null,
    },
  ].filter((p) => p.habilitado)), [tipo, activo, medicionesFiltradas]);

  // Conteo de severidades para el header
  const conteo = useMemo(() => {
    const c: Record<Severidad, number> = { normal: 0, observar: 0, alerta: 0, critico: 0 };
    for (const p of params) {
      const s = severidadDeParametro(p.puntos, p.alerta, p.critico, p.direccion, p.parametro, p.unidad);
      c[s]++;
    }
    return c;
  }, [params]);

  // Auto-abrir el panel mas urgente la primera vez que el usuario llega
  const peor = useMemo(() => {
    let mejor: { key: string; peso: number } | null = null;
    for (const p of params) {
      const s = severidadDeParametro(p.puntos, p.alerta, p.critico, p.direccion, p.parametro, p.unidad);
      const peso = SEVERIDAD_PESO[s];
      if (peso > 0 && (!mejor || peso > mejor.peso)) mejor = { key: p.key, peso };
    }
    return mejor;
  }, [params]);

  React.useEffect(() => {
    if (!usuarioToco && peor) setAbiertos(new Set([peor.key]));
  }, [peor, usuarioToco]);

  const toggle = (key: string) => {
    setUsuarioToco(true);
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (params.length === 0) {
    return (
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-content mb-2 flex items-center gap-2">
          <LineChartIcon size={16} /> Analisis predictivo
        </h2>
        <p className="text-sm text-muted italic">
          La categoria de este activo no tiene parametros de medicion configurados. Configuralo en Configuracion -&gt; Categorias para que aparezcan los graficos de tendencia.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft mb-6">
      {/* Header de la seccion */}
      <div className="p-3 sm:p-4 border border-line">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-wider text-content flex items-center gap-2">
            <LineChartIcon size={16} /> Analisis predictivo
          </h2>
          <div className="flex border border-line flex-wrap">
            {RANGOS.map((r) => (
              <button
                key={r.dias}
                onClick={() => setRangoDias(r.dias)}
                className={`px-2 py-1 text-[11px] font-black uppercase ${
                  rangoDias === r.dias ? 'bg-slate-900 text-white' : 'bg-surface text-muted'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen del estado */}
        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] sm:text-xs">
          <span className="font-bold text-muted">{params.length} parametros</span>
          {conteo.critico > 0 && <span className="px-1.5 py-0.5 bg-danger/10 text-danger-strong dark:text-danger font-black rounded">{conteo.critico} CRITICO</span>}
          {conteo.alerta > 0 && <span className="px-1.5 py-0.5 bg-warn/10 text-warn-strong dark:text-warn font-black rounded">{conteo.alerta} ALERTA</span>}
          {conteo.observar > 0 && <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 font-black rounded">{conteo.observar} OBSERVAR</span>}
          {conteo.normal === params.length && <span className="px-1.5 py-0.5 bg-ok/10 text-ok-strong dark:text-ok font-black rounded">TODO OK</span>}
          <span className="ml-auto text-faint">{medicionesFiltradas.length} mediciones</span>
        </div>
      </div>

      {/* Lista de parametros en acordeon */}
      <div className="divide-y-2 divide-slate-100">
        {params.map((p) => {
          const abierto = abiertos.has(p.key);
          return (
            <div key={p.key}>
              <button
                onClick={() => toggle(p.key)}
                className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 hover:bg-subtle active:bg-subtle transition-colors"
              >
                <ResumenParametro
                  parametro={p.parametro}
                  unidad={p.unidad}
                  puntos={p.puntos}
                  alerta={p.alerta}
                  critico={p.critico}
                  direccion={p.direccion}
                />
                {abierto ? <ChevronUp size={16} className="text-faint flex-shrink-0" /> : <ChevronDown size={16} className="text-faint flex-shrink-0" />}
              </button>
              {abierto && (
                <PanelParametro
                  parametro={p.parametro}
                  unidad={p.unidad}
                  direccion={p.direccion}
                  puntos={p.puntos}
                  alerta={p.alerta}
                  critico={p.critico}
                  rangoNormal={p.rangoNormal}
                  marcadores={tareasParaMarcar}
                  onCrearTareaPredictiva={onCrearTareaPredictiva}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
