import React, { useState } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import { PlantillaMantenimiento, TareaSugerida } from '../data/plantillasMantenimiento';

interface Props {
  abierto: boolean;
  plantilla: PlantillaMantenimiento;
  onCerrar: () => void;
  onAplicar: (tareasSeleccionadas: TareaSugerida[]) => void;
}

function fmtCada(dias: number): string {
  if (dias === 7)   return 'semanal';
  if (dias === 14)  return 'quincenal';
  if (dias === 30)  return 'mensual';
  if (dias === 90)  return 'trimestral';
  if (dias === 180) return 'semestral';
  if (dias === 365) return 'anual';
  return `cada ${dias} dias`;
}

export const ModalPlantillaMantenimiento: React.FC<Props> = ({
  abierto, plantilla, onCerrar, onAplicar,
}) => {
  const [seleccion, setSeleccion] = useState<boolean[]>(() => plantilla.tareas.map(() => true));

  if (!abierto) return null;

  const toggle = (i: number) => {
    setSeleccion((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const todasSelectado = seleccion.every(Boolean);
  const toggleTodas = () => {
    setSeleccion(plantilla.tareas.map(() => !todasSelectado));
  };

  const aplicar = () => {
    const sel = plantilla.tareas.filter((_, i) => seleccion[i]);
    onAplicar(sel);
  };

  const cantidadSel = seleccion.filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-content/40 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="bg-surface border border-line shadow-soft w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border border-line bg-content text-white sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className="text-brand-400 flex-shrink-0" />
            <h3 className="font-black uppercase tracking-wide text-sm truncate">Plan sugerido</h3>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-black text-content uppercase leading-tight">{plantilla.titulo}</h2>
            <p className="text-sm text-muted mt-1 leading-snug">{plantilla.descripcion}</p>
          </div>

          <div className="bg-brand-50 border border-orange-300 p-3 text-sm text-content leading-snug">
            Marca las tareas que querés programar. Las fechas se calculan a partir de hoy. Después podés ajustar cada una desde Mantenimiento.
          </div>

          <button
            type="button"
            onClick={toggleTodas}
            className="text-xs font-black uppercase tracking-wider text-muted underline"
          >
            {todasSelectado ? 'Desmarcar todas' : 'Marcar todas'}
          </button>

          <div className="space-y-2">
            {plantilla.tareas.map((t, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                  seleccion[i] ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface'
                }`}
              >
                <input
                  type="checkbox"
                  checked={seleccion[i]}
                  onChange={() => toggle(i)}
                  className="mt-1 w-5 h-5 flex-shrink-0 accent-brand-600"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-black text-content text-sm">{t.tipo}</span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-600">{fmtCada(t.cadaDias)}</span>
                    {t.prioridad === 'alta' && (
                      <span className="text-[10px] font-black uppercase bg-danger/10 text-danger-strong dark:text-danger border border-danger px-1.5 py-0.5">Prioridad alta</span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1 leading-snug">{t.observaciones}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border border-line bg-subtle sticky bottom-0">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 min-h-[44px] border border-line-strong font-bold text-muted text-sm"
          >
            Omitir
          </button>
          <button
            type="button"
            onClick={aplicar}
            disabled={cantidadSel === 0}
            className="flex items-center gap-2 px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft text-sm disabled:opacity-40 disabled:shadow-none"
          >
            Programar {cantidadSel} {cantidadSel === 1 ? 'tarea' : 'tareas'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
