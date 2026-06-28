/**
 * Diagnostico asistido: lee el catalogo de fallas del activo y rankea las
 * que mejor coinciden con los sintomas que el operario esta ingresando.
 *
 * Es lo que convierte la pantalla de medicion en una guia ('estas viendo
 * que el equipo esta caliente, las causas probables son X, Y, Z') en vez
 * de un formulario en blanco.
 *
 * Logica simple intencionalmente: matching por palabras clave entre el
 * sintoma de la falla y lo que el operario tiene en pantalla. Si en el
 * futuro queremos ML / embeddings, este componente cambia internamente
 * sin tocar el caller.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Stethoscope, ChevronDown, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { API_URL } from '../data/auth';

interface Causa { causa: string; probabilidad: 'alta' | 'media' | 'baja'; }
interface Falla {
  id: string;
  codigo: string | null;
  sintoma: string;
  causas: Causa[];
  solucion: string;
  severidad: 'info' | 'advertencia' | 'critico';
}

interface SintomasOperario {
  temperatura?: string;
  amperaje?: string;
  presion?: string;
  vibracion?: string;
  observaciones?: string;
}

interface Props {
  activoId: string;
  sintomas: SintomasOperario;
}

// Mapa de palabras clave que aparecen en sintomas/observaciones a tokens
// que buscamos en el catalogo de fallas. Es ad-hoc pero suficiente para v1.
function tokensDesdeSintomas(s: SintomasOperario): string[] {
  const tokens: string[] = [];
  const tempNum = parseFloat(s.temperatura ?? '');
  if (!Number.isNaN(tempNum) && tempNum > 80) tokens.push('temperatura', 'caliente', 'sobrecalentamiento', 'recalent');
  const ampNum = parseFloat(s.amperaje ?? '');
  if (!Number.isNaN(ampNum) && ampNum > 0) tokens.push('amperaje', 'corriente', 'sobrecorriente');
  const presNum = parseFloat(s.presion ?? '');
  if (!Number.isNaN(presNum)) {
    if (presNum < 1) tokens.push('presion baja', 'sin presion');
    if (presNum > 9) tokens.push('presion alta', 'alta presion');
  }
  if (s.vibracion === 'alta' || s.vibracion === 'moderada') tokens.push('vibracion', 'vibra', 'sacudid');
  // Palabras clave en observaciones
  const obs = (s.observaciones ?? '').toLowerCase();
  const candidatos = ['humo', 'ruido', 'fuga', 'aceite', 'agua', 'no arranca', 'no enciende', 'no levanta', 'patinaje', 'patina', 'desalineac', 'cadena', 'rodillo', 'pala', 'rotor', 'mastil', 'inyect', 'bateria', 'cable', 'olor', 'quemado', 'corte', 'tira', 'tirones'];
  for (const c of candidatos) if (obs.includes(c)) tokens.push(c);
  return tokens;
}

function puntaje(falla: Falla, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const texto = (falla.sintoma + ' ' + falla.causas.map((c) => c.causa).join(' ')).toLowerCase();
  let p = 0;
  for (const t of tokens) {
    if (texto.includes(t)) p += t.length >= 5 ? 2 : 1;
  }
  // Bonus por severidad: cuando el operario ya esta cargando alarmas reales,
  // las fallas criticas suelen ser las relevantes.
  if (falla.severidad === 'critico') p += 0.5;
  return p;
}

const SEV_ICON: Record<string, React.ReactNode> = {
  critico: <AlertOctagon size={12} />,
  advertencia: <AlertTriangle size={12} />,
  info: <Info size={12} />,
};
const SEV_COLOR: Record<string, string> = {
  critico: 'border-danger bg-danger/10 text-danger-strong dark:text-danger',
  advertencia: 'border-warn bg-warn/10 text-warn-strong dark:text-warn',
  info: 'border-line bg-subtle text-muted',
};

export const DiagnosticoSugerido: React.FC<Props> = ({ activoId, sintomas }) => {
  const [fallas, setFallas] = useState<Falla[] | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  useEffect(() => {
    if (!activoId || !API_URL) return;
    fetch(`${API_URL}/public/fallas/activo/${activoId}`)
      .then((r) => r.json())
      .then((d) => setFallas(Array.isArray(d) ? d : []))
      .catch(() => setFallas([]));
  }, [activoId]);

  const sugeridas = useMemo(() => {
    if (!fallas || fallas.length === 0) return [];
    const tokens = tokensDesdeSintomas(sintomas);
    if (tokens.length === 0) return [];
    return fallas
      .map((f) => ({ falla: f, p: puntaje(f, tokens) }))
      .filter(({ p }) => p > 0)
      .sort((a, b) => b.p - a.p)
      .slice(0, 5)
      .map(({ falla }) => falla);
  }, [fallas, sintomas]);

  if (sugeridas.length === 0) return null;

  return (
    <div className="border border-brand-600 bg-brand-50/50 p-3 space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-brand-700 flex items-center gap-1.5">
        <Stethoscope size={13} /> Diagnostico asistido — segun lo que estas viendo
      </p>
      <p className="text-xs text-brand-700/80">Posibles fallas que coinciden con tu lectura. Tocá una para ver causas y solucion.</p>
      <div className="space-y-1.5">
        {sugeridas.map((f) => {
          const open = abierta === f.id;
          return (
            <div key={f.id} className="bg-surface border border-line">
              <button
                type="button"
                onClick={() => setAbierta(open ? null : f.id)}
                className="w-full text-left px-2.5 py-2 flex items-start gap-2 hover:bg-subtle transition-colors"
              >
                <span className={`text-[10px] font-black uppercase px-1 py-0.5 border flex items-center gap-0.5 whitespace-nowrap flex-shrink-0 ${SEV_COLOR[f.severidad] ?? SEV_COLOR.info}`}>
                  {SEV_ICON[f.severidad] ?? SEV_ICON.info}
                  {f.severidad}
                </span>
                <span className="flex-1 min-w-0">
                  {f.codigo && <span className="text-[10px] font-mono text-faint block">{f.codigo}</span>}
                  <span className="text-xs font-semibold text-content leading-snug">{f.sintoma}</span>
                </span>
                <ChevronDown size={14} className={`text-faint flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="border-t border-line px-2.5 py-2 bg-subtle space-y-2 text-xs">
                  <div>
                    <p className="font-black uppercase tracking-wider text-muted mb-1">Causas probables</p>
                    <ul className="space-y-0.5">
                      {f.causas.map((c, i) => (
                        <li key={i} className="text-content leading-snug">
                          <span className={`text-[9px] font-black uppercase mr-1 ${c.probabilidad === 'alta' ? 'text-danger-strong dark:text-danger' : c.probabilidad === 'media' ? 'text-warn-strong dark:text-warn' : 'text-muted'}`}>
                            [{c.probabilidad}]
                          </span>
                          {c.causa}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-wider text-muted mb-1">Solucion</p>
                    <pre className="text-content leading-relaxed whitespace-pre-wrap font-sans">{f.solucion}</pre>
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
