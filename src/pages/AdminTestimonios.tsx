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
          <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Testimonios</h1>
          <p className="text-slate-500 text-sm mt-1">Moderación de la landing pública</p>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] p-3 mb-4 flex gap-2 flex-wrap">
        {(['pendiente', 'aprobado', 'rechazado', 'todos'] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 h-9 text-xs font-black uppercase tracking-wider border-2 transition-colors ${
              filtro === f
                ? 'bg-orange-500 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
            }`}
          >
            {f}
            {f === 'pendiente' && filtro !== 'pendiente' && pendientesCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white px-1 text-[10px]">{pendientesCount}</span>
            )}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-slate-400 font-mono text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-red-600 font-bold text-sm">{error}</p>
      ) : lista.length === 0 ? (
        <div className="bg-white border-2 border-slate-300 border-dashed p-8 text-center text-slate-500 text-sm">
          Sin testimonios en esta categoría.
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((t) => (
            <article
              key={t.id}
              className={`bg-white border-2 p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] ${
                t.destacado ? 'border-orange-500' : 'border-slate-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div className="min-w-0">
                  <p className="font-black text-slate-900 text-sm">{t.nombre}</p>
                  {t.rol && <p className="text-xs text-slate-500 font-mono">{t.rol}</p>}
                  {t.email && <p className="text-xs text-slate-400 font-mono">{t.email}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`px-2 py-0.5 font-black uppercase border ${
                    t.estado === 'pendiente' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                    t.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                    'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>{t.estado}</span>
                  {t.destacado && (
                    <span className="flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 font-black uppercase">
                      <Star size={10} fill="currentColor" /> destacado
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-400 font-mono">
                    <Clock size={10} /> {new Date(t.creadoEn).toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line mb-3 border-l-2 border-slate-200 pl-3">
                {t.mensaje}
              </p>
              <div className="flex gap-2 flex-wrap">
                {t.estado !== 'aprobado' && (
                  <button
                    onClick={() => accion(() => aprobarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 h-9 text-xs font-black uppercase tracking-wider border-2 border-slate-900"
                  >
                    <Check size={13} /> Aprobar
                  </button>
                )}
                {t.estado !== 'rechazado' && (
                  <button
                    onClick={() => accion(() => rechazarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-slate-700 text-white px-3 h-9 text-xs font-black uppercase tracking-wider border-2 border-slate-900"
                  >
                    <XIcon size={13} /> Rechazar
                  </button>
                )}
                {t.estado === 'aprobado' && (
                  <button
                    onClick={() => accion(() => destacarTestimonio(t.id))}
                    className="flex items-center gap-1.5 bg-orange-500 text-white px-3 h-9 text-xs font-black uppercase tracking-wider border-2 border-slate-900"
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
                  className="flex items-center gap-1.5 bg-white text-red-600 px-3 h-9 text-xs font-black uppercase tracking-wider border-2 border-red-300"
                >
                  <Trash2 size={13} /> Eliminar
                </button>
                {t.ip && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono ml-auto">
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
