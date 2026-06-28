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
  critico: 'border-danger bg-danger/10 text-danger-strong dark:text-danger',
  advertencia: 'border-warn bg-warn/10 text-warn-strong dark:text-warn',
  info: 'border-line bg-subtle text-muted',
};
const SEV_ICON: Record<string, React.ReactNode> = {
  critico: <AlertOctagon size={14} />,
  advertencia: <AlertTriangle size={14} />,
  info: <Info size={14} />,
};
const PROB_COLOR: Record<string, string> = {
  alta: 'bg-danger/10 text-danger-strong dark:text-danger border-danger',
  media: 'bg-warn/10 text-warn-strong dark:text-warn border-warn',
  baja: 'bg-subtle text-muted border-line',
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
    <div className="bg-surface border border-line shadow-soft p-5">
      <p className="text-xs font-black uppercase tracking-wider text-brand-600 mb-1 flex items-center gap-1.5">
        <Wrench size={13} /> Codigos de error y soluciones
      </p>
      <p className="text-xs text-muted mb-3">
        Sintomas tipicos de este tipo de equipo, con causas probables y como resolverlas.
      </p>

      <div className="space-y-2">
        {fallas.map((f) => {
          const open = abierta === f.id;
          return (
            <div key={f.id} className="border border-line">
              <button
                type="button"
                onClick={() => setAbierta(open ? null : f.id)}
                className="w-full text-left px-3 py-2.5 flex items-start gap-2 hover:bg-subtle transition-colors"
              >
                <span className={`text-xs font-black uppercase px-1.5 py-0.5 border flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${SEV_COLOR[f.severidad] ?? SEV_COLOR.info}`}>
                  {SEV_ICON[f.severidad] ?? SEV_ICON.info}
                  {f.severidad}
                </span>
                <span className="flex-1 min-w-0">
                  {f.codigo && (
                    <span className="text-[11px] font-mono font-bold text-faint block">{f.codigo}</span>
                  )}
                  <span className="text-sm font-semibold text-content leading-snug">{f.sintoma}</span>
                </span>
                <ChevronDown size={16} className={`text-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border border-line px-3 py-3 space-y-3 bg-subtle/50">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted mb-1.5">Causas probables</p>
                    <ul className="space-y-1">
                      {f.causas.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-content">
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border flex-shrink-0 mt-0.5 ${PROB_COLOR[c.probabilidad] ?? PROB_COLOR.baja}`}>
                            {c.probabilidad}
                          </span>
                          <span className="leading-snug">{c.causa}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-muted mb-1.5">Solucion paso a paso</p>
                    <pre className="text-sm text-content leading-relaxed whitespace-pre-wrap font-sans">{f.solucion}</pre>
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
