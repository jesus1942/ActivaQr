import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, Send, Check, AlertCircle } from 'lucide-react';
import {
  getTestimoniosPublicos,
  enviarTestimonio,
  TestimonioPublico,
} from '../../data/testimoniosApi';

export const MuroTestimonios: React.FC = () => {
  const [lista, setLista] = useState<TestimonioPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vistaForm, setVistaForm] = useState(false);

  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  useEffect(() => {
    getTestimoniosPublicos()
      .then(setLista)
      .catch(() => setLista([]))
      .finally(() => setCargando(false));
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await enviarTestimonio({
        nombre: nombre.trim(),
        rol: rol.trim() || undefined,
        email: email.trim() || undefined,
        mensaje: mensaje.trim(),
      });
      setExito(true);
      setNombre('');
      setRol('');
      setEmail('');
      setMensaje('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-orange-500 text-white px-3 py-1 border-2 border-slate-900 text-xs font-black uppercase tracking-wider mb-3">
          <MessageSquare size={14} />
          Voces de la comunidad
        </div>
        <h2 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase leading-tight">
          ¿Qué dice la gente del rubro?
        </h2>
        <p className="text-slate-600 mt-3 max-w-xl mx-auto leading-snug">
          Técnicos, dueños de PYMES, mantenedores, contratistas. Si trabajás con activos, contanos tu experiencia.
        </p>
      </div>

      {cargando ? (
        <p className="text-center text-slate-400 font-mono text-sm">Cargando voces...</p>
      ) : lista.length === 0 ? (
        <div className="bg-white border-2 border-slate-300 border-dashed p-6 text-center text-slate-500 text-sm">
          Aún no hay testimonios publicados. Sé el primero en dejar el tuyo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {lista.map((t) => (
            <article
              key={t.id}
              className={`bg-white border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${
                t.destacado ? 'border-orange-500' : 'border-slate-900'
              }`}
            >
              {t.destacado && (
                <div className="flex items-center gap-1 text-orange-600 mb-2 text-xs font-black uppercase tracking-wider">
                  <Star size={12} fill="currentColor" />
                  Destacado
                </div>
              )}
              <p className="text-slate-800 leading-relaxed text-sm whitespace-pre-line">
                {t.mensaje}
              </p>
              <div className="mt-3 pt-3 border-t-2 border-dashed border-slate-200">
                <p className="font-black text-slate-900 text-sm">{t.nombre}</p>
                {t.rol && <p className="text-xs text-slate-500 font-mono">{t.rol}</p>}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* CTA para dejar testimonio */}
      <div className="text-center">
        {!vistaForm ? (
          <button
            onClick={() => setVistaForm(true)}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 min-h-[48px] font-black uppercase tracking-wide border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(249,115,22,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_0px_rgba(249,115,22,1)] transition-all text-sm"
          >
            <Send size={16} />
            Dejar mi testimonio
          </button>
        ) : exito ? (
          <div className="bg-emerald-50 border-2 border-emerald-500 p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-emerald-700 mb-2">
              <Check size={20} />
              <p className="font-black uppercase tracking-wide text-sm">Recibido</p>
            </div>
            <p className="text-sm text-slate-700">
              Gracias por compartir tu experiencia. Tu testimonio queda pendiente de revisión y va a aparecer publicado cuando lo aprobemos.
            </p>
            <button
              onClick={() => { setExito(false); setVistaForm(false); }}
              className="mt-3 text-xs underline text-slate-600"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form
            onSubmit={enviar}
            className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] p-5 max-w-xl mx-auto text-left space-y-3"
          >
            <h3 className="font-black uppercase tracking-wide text-slate-900 text-sm">Contanos tu experiencia</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={80}
                  className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">Rol / empresa</label>
                <input
                  type="text"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  maxLength={80}
                  placeholder="Ej: Técnico, Dueña de gimnasio"
                  className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                Email (opcional, no se publica)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={120}
                className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">Tu mensaje *</label>
              <textarea
                required
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                maxLength={1500}
                rows={4}
                placeholder="Contá tu experiencia con el mantenimiento, qué te frustra, qué te ayudaría..."
                className="w-full border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">{mensaje.length}/1500</p>
            </div>
            {error && (
              <div className="bg-red-50 border-2 border-red-500 p-2 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setVistaForm(false)}
                className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600 text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 min-h-[44px] font-black uppercase tracking-wide border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] text-sm disabled:opacity-50"
              >
                <Send size={14} />
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Tu mensaje será revisado antes de aparecer público. Al enviar aceptás nuestras políticas.
            </p>
          </form>
        )}
      </div>
    </section>
  );
};
