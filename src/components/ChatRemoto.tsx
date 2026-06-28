// v1.1
import React, { useEffect, useRef, useState } from 'react';
import { Send, ImagePlus, Mic, Square } from 'lucide-react';
import { MensajeRemoto, MensajePayload } from '../data/accesoRemotoApi';

interface Props {
  mensajes: MensajeRemoto[];
  miRol: 'superadmin' | 'cliente';
  onEnviar: (payload: MensajePayload) => Promise<void>;
  cargando?: boolean;
}

const MAX_DIM = 1280;
const MAX_SEGUNDOS = 60;

/** Comprime una imagen a JPEG con dimensión máxima MAX_DIM y devuelve un data URL. */
function comprimirImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen.'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo procesar el audio.'));
    reader.readAsDataURL(blob);
  });
}

export const ChatRemoto: React.FC<Props> = ({ mensajes, miRol, onEnviar, cargando }) => {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const enviar = async (payload: MensajePayload) => {
    setEnviando(true);
    setError(null);
    try {
      await onEnviar(payload);
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarTexto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    const contenido = texto.trim();
    await enviar({ contenido });
    setTexto('');
  };

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const adjunto = await comprimirImagen(file);
      await enviar({ tipo: 'imagen', adjunto });
    } catch (err: any) {
      setError(err?.message || 'No se pudo procesar la imagen.');
    }
  };

  const detenerGrabacion = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
  };

  const iniciarGrabacion = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setGrabando(false);
        setSegundos(0);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        try {
          const adjunto = await blobADataUrl(blob);
          await enviar({ tipo: 'audio', adjunto });
        } catch (err: any) {
          setError(err?.message || 'No se pudo enviar el audio.');
        }
      };
      recorder.start();
      setGrabando(true);
      setSegundos(0);
      timerRef.current = setInterval(() => {
        setSegundos((s) => {
          if (s + 1 >= MAX_SEGUNDOS) detenerGrabacion();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError('No se pudo acceder al micrófono. Verificá los permisos.');
    }
  };

  return (
    <div className="flex flex-col border border-line bg-surface rounded-lg overflow-hidden shadow-soft" style={{ height: '360px' }}>
      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-subtle">
        {cargando && <p className="text-xs text-faint text-center animate-pulse">Cargando mensajes...</p>}
        {!cargando && mensajes.length === 0 && (
          <p className="text-xs text-faint text-center mt-8">Sin mensajes aún.</p>
        )}
        {mensajes.map((m) => {
          const esMio = m.autorRol === miRol;
          return (
            <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-md ${esMio
                ? 'bg-brand-600 text-white'
                : 'bg-surface text-content border border-line'
              } px-3 py-2 shadow-soft`}>
                {!esMio && (
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-brand-600">{m.autorNombre}</p>
                )}
                {m.tipo === 'imagen' && m.adjunto ? (
                  <img
                    src={m.adjunto}
                    alt="Adjunto"
                    onClick={() => window.open(m.adjunto!, '_blank')}
                    className="max-w-full max-h-48 border border-line cursor-pointer rounded"
                  />
                ) : m.tipo === 'audio' && m.adjunto ? (
                  <audio controls src={m.adjunto} className="max-w-full" />
                ) : (
                  <p className="text-sm leading-relaxed">{m.contenido}</p>
                )}
                <p className={`text-xs mt-1 ${esMio ? 'text-white/70' : 'text-faint'}`}>
                  {new Date(m.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  {esMio && !m.leido && ' · no leído'}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-3 py-1.5 text-xs font-semibold text-danger-strong dark:text-danger bg-danger/10 border-t border-danger/40">{error}</p>
      )}

      {/* Input */}
      {grabando ? (
        <div className="border-t border-line flex items-center gap-3 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-danger">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
            Grabando {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={detenerGrabacion}
            className="press ml-auto flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-md font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            <Square size={14} /> Detener
          </button>
        </div>
      ) : (
        <form onSubmit={handleEnviarTexto} className="border-t border-line flex items-stretch">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleArchivo} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={enviando}
            title="Enviar foto"
            className="px-3 border-r border-line text-muted hover:text-brand-600 disabled:opacity-40 transition-colors"
          >
            <ImagePlus size={16} />
          </button>
          <button
            type="button"
            onClick={iniciarGrabacion}
            disabled={enviando}
            title="Grabar audio"
            className="px-3 border-r border-line text-muted hover:text-brand-600 disabled:opacity-40 transition-colors"
          >
            <Mic size={16} />
          </button>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí un mensaje..."
            className="flex-1 px-3 py-2 text-sm outline-none bg-surface text-content placeholder:text-faint"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            className="px-4 bg-brand-600 text-white border-l border-line font-semibold disabled:opacity-40 hover:bg-brand-700 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};
