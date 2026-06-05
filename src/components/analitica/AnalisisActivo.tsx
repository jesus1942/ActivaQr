import React, { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { LineChart as LineChartIcon } from 'lucide-react';
import { PanelParametro } from './PanelParametro';
import { Activo, Medicion, TareaMantenimiento, TipoActivo } from '../../data/types';

interface AnalisisActivoProps {
  activo: Activo;
  tipo: TipoActivo | undefined;
  mediciones: Medicion[];
  tareas: TareaMantenimiento[];
  onCrearTareaPredictiva?: (texto: string) => void;
}

const RANGOS = [
  { label: '1 mes', dias: 30 },
  { label: '3 meses', dias: 90 },
  { label: '6 meses', dias: 180 },
  { label: '12 meses', dias: 365 },
  { label: '18 meses', dias: 548 },
  { label: 'Todo', dias: 100000 },
];

export const AnalisisActivo: React.FC<AnalisisActivoProps> = ({
  activo, tipo, mediciones, tareas, onCrearTareaPredictiva,
}) => {
  const [rangoDias, setRangoDias] = useState<number>(180);

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

  // Que parametros muestro: lo decide el tipo de activo via sus flags mide*.
  const mide = {
    temperatura: tipo?.mideTemperatura ?? false,
    amperaje: tipo?.mideAmperaje ?? false,
    voltaje: tipo?.mideVoltaje ?? false,
    presion: tipo?.midePresion ?? false,
    bateria: tipo?.mideBateria ?? false,
    toner: tipo?.mideToner ?? false,
    contador: tipo?.mideContador ?? false,
  };
  const hayParametros = mide.temperatura || mide.amperaje || mide.voltaje || mide.presion || mide.bateria || mide.toner || mide.contador;

  if (!hayParametros) {
    return (
      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-6">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
          <LineChartIcon size={16} /> Analisis predictivo
        </h2>
        <p className="text-sm text-slate-500 italic">
          La categoria de este activo no tiene parametros de medicion configurados. Configuralo en Configuracion -&gt; Categorias para que aparezcan los graficos de tendencia.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <LineChartIcon size={16} /> Analisis predictivo
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500">Rango:</span>
            <div className="flex border-2 border-slate-300">
              {RANGOS.map((r) => (
                <button
                  key={r.dias}
                  onClick={() => setRangoDias(r.dias)}
                  className={`px-2 py-1 text-xs font-bold uppercase ${
                    rangoDias === r.dias ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {medicionesFiltradas.length} mediciones en el rango seleccionado · {tareasParaMarcar.length} tareas marcadas en los graficos.
        </p>
      </div>

      {mide.temperatura && (
        <PanelParametro
          parametro="Temperatura"
          unidad="°C"
          direccion="creciente"
          puntos={medicionesFiltradas.filter((m) => m.temperatura != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.temperatura as number }))}
          alerta={activo.temperaturaAlerta}
          critico={activo.temperaturaCritica}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.amperaje && (
        <PanelParametro
          parametro="Amperaje"
          unidad="A"
          direccion="creciente"
          puntos={medicionesFiltradas.filter((m) => m.amperaje != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.amperaje as number }))}
          alerta={activo.amperajeAlerta ?? null}
          critico={activo.amperajeCritico ?? null}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.voltaje && (
        <PanelParametro
          parametro="Voltaje"
          unidad="V"
          direccion="creciente"
          puntos={medicionesFiltradas.filter((m) => (m as any).voltaje != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).voltaje as number }))}
          alerta={activo.voltajeAlerta ?? null}
          rangoNormal={activo.voltajeMin != null && activo.voltajeMax != null ? { min: activo.voltajeMin, max: activo.voltajeMax } : undefined}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.presion && (
        <PanelParametro
          parametro="Presion"
          unidad="bar"
          direccion="creciente"
          puntos={medicionesFiltradas.filter((m) => m.presion != null).map((m) => ({ fecha: new Date(m.fecha), valor: m.presion as number }))}
          alerta={activo.presionAlerta ?? null}
          critico={activo.presionCritica ?? null}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.bateria && (
        <PanelParametro
          parametro="Bateria"
          unidad="%"
          direccion="decreciente"
          puntos={medicionesFiltradas.filter((m) => (m as any).porcentajeBateria != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).porcentajeBateria as number }))}
          alerta={activo.bateriaAlerta ?? null}
          critico={activo.bateriaCritica ?? null}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.toner && (
        <PanelParametro
          parametro="Toner"
          unidad="%"
          direccion="decreciente"
          puntos={medicionesFiltradas.filter((m) => (m as any).nivelToner != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).nivelToner as number }))}
          alerta={activo.tonerAlerta ?? null}
          critico={activo.tonerCritico ?? null}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
      {mide.contador && (
        <PanelParametro
          parametro="Contador"
          unidad=""
          direccion="creciente"
          puntos={medicionesFiltradas.filter((m) => (m as any).contador != null).map((m) => ({ fecha: new Date(m.fecha), valor: (m as any).contador as number }))}
          alerta={activo.intervaloMedicionHoras ? activo.horasActuales + activo.intervaloMedicionHoras : null}
          critico={activo.intervaloMedicionHoras ? activo.horasActuales + activo.intervaloMedicionHoras * 1.2 : null}
          marcadores={tareasParaMarcar}
          onCrearTareaPredictiva={onCrearTareaPredictiva}
        />
      )}
    </div>
  );
};
