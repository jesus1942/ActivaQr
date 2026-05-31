import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { MensajeRemoto } from '../data/accesoRemotoApi';

interface Props {
  mensajes: MensajeRemoto[];
  miRol: 'superadmin' | 'cliente';
  onEnviar: (contenido: string) => Promise<void>;
  cargando?: boolean;
}

export const ChatRemoto: React.FC<Props> = ({ mensajes, miRol, onEnviar, cargando }) => {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    try {
      await onEnviar(texto.trim());
      setTexto('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col border-2 border-slate-900 bg-white" style={{ height: '360px' }}>
      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
        {cargando && <p className="text-xs text-slate-400 text-center animate-pulse">Cargando mensajes...</p>}
        {!cargando && mensajes.length === 0 && (
          <p className="text-xs text-slate-400 text-center mt-8">Sin mensajes aún.</p>
        )}
        {mensajes.map((m) => {
          const esMio = m.autorRol === miRol;
          return (
            <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${esMio
                ? 'bg-orange-500 text-white border-2 border-orange-700'
                : 'bg-white text-slate-800 border-2 border-slate-300'
              } px-3 py-2 shadow-[2px_2px_0px_rgba(0,0,0,0.15)]`}>
                {!esMio && (
                  <p className="text-xs font-black uppercase tracking-wider mb-1 text-orange-600">{m.autorNombre}</p>
                )}
                <p className="text-sm leading-relaxed">{m.contenido}</p>
                <p className={`text-xs mt-1 ${esMio ? 'text-orange-200' : 'text-slate-400'}`}>
                  {new Date(m.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  {esMio && !m.leido && ' · no leído'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleEnviar} className="border-t-2 border-slate-900 flex">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 px-3 py-2 text-sm outline-none bg-white"
          disabled={enviando}
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          className="px-4 bg-orange-500 text-white border-l-2 border-slate-900 font-bold disabled:opacity-40 hover:bg-orange-600 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
