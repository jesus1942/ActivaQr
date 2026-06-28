import React, { useEffect, useState } from 'react';
import { MessageSquare, Check, X as XIcon, Star, Trash2, Clock, Eye } from 'lucide-react';
import {
  getTestimoniosAdmin,
  aprobarTestimonio,
  rechazarTestimonio,
  destacarTestimonio,
  eliminarTestimonio,
  TestimonioAdmin,
} from '../data/testimoniosApi';

type Filtro = 'pendiente' | 'aprobado' | 'rechazado' | 'todos';

export const AdminTestimonios: React.FC = () => {
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [lista, setLista] = useState<TestimonioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = () => {
    setCargando(true);
    setError('');
    const estado = filtro === 'todos' ? undefined : filtro;
    getTestimoniosAdmin(estado)
      .then(setLista)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setCargando(false));
  };

  useEffect(cargar, [filtro]);

  const accion = async (fn: () => Promise<void>) => {
    try {
      await fn();
      cargar();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  };

  const pendientesCount = lista.filter((t) => t.estado === 'pendiente').length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Testimonios</h1>
          <p className="text-muted text-sm mt-1">Moderación de la landing pública</p>
        </div>
      </div>

      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-3 mb-4 flex gap-2 flex-wrap">
        {(['pendiente', 'aprobado', 'rechazado', 'todos'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 h-9 text-xs font-black uppercase tracking-wider border transition-colors ${
              filtro === f
                ? 'bg-brand-600 text-white border-line'
                : 'bg-surface text-muted border-line hover:border-content'
            }`}
          >
            {f}
            {f === 'pendiente' && filtro !== 'pendiente' && pendientesCount > 0 && (
              <span className="ml-1.5 bg-danger text-white px-1 text-[10px]">{pendientesCount}</span>
            )}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-faint font-mono text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-danger font-bold text-sm">{error}</p>
      ) : lista.length === 0 ? (
        <div className="bg-surface/85 backdrop-blur-xl border border-line border-dashed p-8 text-center text-muted text-sm">
          Sin testimonios en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((t) => (
            <article
              key={t.id}
              className={`bg-surface border p-4 shadow-soft ${
                t.destacado ? 'border-brand-600' : 'border-line'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0">
                  <p className="font-black text-content text-sm">{t.nombre}</p>
                  {t.rol && <p className="text-xs text-muted font-mono">{t.rol}</p>}
                  {t.email && <p className="text-xs text-faint font-mono">{t.email}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`px-2 py-0.5 font-black uppercase border ${
                    t.estado === 'pendiente' ? 'bg-warn/10 text-warn-strong dark:text-warn border-warn' :
                    t.estado === 'aprobado' ? 'bg-ok/10 text-ok-strong dark:text-ok border-ok' :
                    'bg-subtle text-muted border-line'
                  }`}>{t.estado}</span>
                  {t.destacado && (
                    <span className="flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 font-black uppercase">
                      <Star size={10} fill="currentColor" /> destacado
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-faint font-mono">
                    <Clock size={10} /> {new Date(t.creadoEn).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-content leading-relaxed whitespace-pre-line mb-3 border-l-2 border-line pl-3">
                {t.mensaje}
              </p>
              <div className="flex gap-2 flex-wrap">
                {t.estado !== 'aprobado' && (
                  <button
                    onClick={() => accion(() => aprobarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-ok text-white px-3 h-9 text-xs font-black uppercase tracking-wider border border-line"
                  >
                    <Check size={13} /> Aprobar
                  </button>
                )}
                {t.estado !== 'rechazado' && (
                  <button
                    onClick={() => accion(() => rechazarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-slate-700 text-white px-3 h-9 text-xs font-black uppercase tracking-wider border border-line"
                  >
                    <XIcon size={13} /> Rechazar
                  </button>
                )}
                {t.estado === 'aprobado' && (
                  <button
                    onClick={() => accion(() => destacarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-brand-600 text-white px-3 h-9 text-xs font-black uppercase tracking-wider border border-line"
                  >
                    <Star size={13} /> {t.destacado ? 'Quitar destacado' : 'Destacar'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Eliminar este testimonio? No se puede deshacer.')) {
                      accion(() => eliminarTestimonio(t.id));
                    }
                  }}
                  className="flex items-center gap-1.5 bg-surface text-danger px-3 h-9 text-xs font-black uppercase tracking-wider border border-danger"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
                {t.ip && (
                  <span className="flex items-center gap-1 text-[11px] text-faint font-mono ml-auto">
                    <Eye size={11} /> IP {t.ip}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
