import React, { useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, Wrench, ChevronDown } from 'lucide-react';
import { API_URL } from '../data/auth';

interface Causa {
  causa: string;
  probabilidad: 'alta' | 'media' | 'baja';
}

export interface Falla {
  id: string;
  codigo: string | null;
  sintoma: string;
  causas: Causa[];
  solucion: string;
  severidad: 'info' | 'advertencia' | 'critico';
}

interface Props {
  activoId: string;
  /** Si true, hace fetch al endpoint publico (sin auth). Si false, al privado. */
  publico?: boolean;
}

const SEV_COLOR: Record<string, string> = {
  critico: 'border-red-500 bg-red-50 text-red-700',
  advertencia: 'border-amber-400 bg-amber-50 text-amber-700',
  info: 'border-slate-300 bg-slate-50 text-slate-600',
};
const SEV_ICON: Record<string, React.ReactNode> = {
  critico: <AlertOctagon size={14} />,
  advertencia: <AlertTriangle size={14} />,
  info: <Info size={14} />,
};
const PROB_COLOR: Record<string, string> = {
  alta: 'bg-red-100 text-red-700 border-red-300',
  media: 'bg-amber-100 text-amber-700 border-amber-300',
  baja: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const FallasActivo: React.FC<Props> = ({ activoId, publico = false }) => {
  const [fallas, setFallas] = useState<Falla[] | null>(null);
  const [error, setError] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!activoId || !API_URL) return;
    const url = publico
      ? `${API_URL}/public/fallas/activo/${activoId}`
      : `${API_URL}/public/fallas/activo/${activoId}`; // por ahora misma fuente, mas adelante se puede agregar contexto del tenant
    fetch(url)
      .then((r) => r.json())
      .then((data) => setFallas(Array.isArray(data) ? data : []))
      .catch(() => setError(true));
  }, [activoId, publico]);

  if (error || !fallas) return null;
  if (fallas.length === 0) return null;

  return (
    <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-5">
      <p className="text-xs font-black uppercase tracking-wider text-orange-500 mb-1 flex items-center gap-1.5">
        <Wrench size={13} /> Codigos de error y soluciones
      </p>
      <p className="text-xs text-slate-500 mb-3">
        Sintomas tipicos de este tipo de equipo, con causas probables y como resolverlas.
      </p>

      <div className="space-y-2">
        {fallas.map((f) => {
          const open = abierta === f.id;
          return (
            <div key={f.id} className="border-2 border-slate-200">
              <button
                type="button"
                onClick={() => setAbierta(open ? null : f.id)}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-slate-50 transition-colors"
              >
                <span className={`text-xs font-black uppercase px-1.5 py-0.5 border-2 flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${SEV_COLOR[f.severidad] ?? SEV_COLOR.info}`}>
                  {SEV_ICON[f.severidad] ?? SEV_ICON.info}
                  {f.severidad}
                </span>
                <span className="flex-1 min-w-0">
                  {f.codigo && (
                    <span className="text-[11px] font-mono font-bold text-slate-400 block">{f.codigo}</span>
                  )}
                  <span className="text-sm font-semibold text-slate-800 leading-snug">{f.sintoma}</span>
                </span>
                <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t-2 border-slate-200 px-3 py-3 space-y-3 bg-slate-50/50">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Causas probables</p>
                    <ul className="space-y-1">
                      {f.causas.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border flex-shrink-0 mt-0.5 ${PROB_COLOR[c.probabilidad] ?? PROB_COLOR.baja}`}>
                            {c.probabilidad}
                          </span>
                          <span className="leading-snug">{c.causa}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">Solucion paso a paso</p>
                    <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{f.solucion}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
