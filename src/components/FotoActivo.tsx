import React, { useRef, useState } from 'react';
import { Camera, Trash2, ImageOff } from 'lucide-react';
import { apiFetch } from '../data/auth';
import { comprimirImagen } from '../utils/comprimirImagen';

interface FotoActivoProps {
  activoId: string;
  fotoUrl: string | null | undefined;
  nombre: string;
  // Actualiza el store local para que la card y la ficha reflejen el cambio
  // sin esperar un reload.
  onChange: (fotoUrl: string | null) => void;
}

export const FotoActivo: React.FC<FotoActivoProps> = ({ activoId, fotoUrl, nombre, onChange }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [err, setErr] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr('');
    setSubiendo(true);
    try {
      const dataUrl = await comprimirImagen(file);
      const res = await apiFetch(`activos/${activoId}/foto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dataUrl }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'No se pudo subir la foto.');
      }
      onChange(dataUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al subir la foto.');
    } finally {
      setSubiendo(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Quitar la foto del activo?')) return;
    setErr('');
    try {
      const res = await apiFetch(`activos/${activoId}/foto`, { method: 'DELETE' });
      if (!res.ok) throw new Error('No se pudo quitar la foto.');
      onChange(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error.');
    }
  };

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft overflow-hidden">
      {fotoUrl ? (
        <div className="relative">
          <img
            src={fotoUrl}
            alt={nombre}
            className="w-full aspect-video object-cover block"
          />
          <div className="absolute bottom-2 right-2 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="flex items-center gap-1.5 bg-surface/95 border border-line px-2.5 py-1.5 text-xs font-black uppercase shadow-soft disabled:opacity-60"
            >
              <Camera size={13} /> {subiendo ? 'Subiendo...' : 'Cambiar'}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 bg-surface/95 border border-danger text-danger px-2.5 py-1.5 text-xs font-black uppercase shadow-soft"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="w-full aspect-video flex flex-col items-center justify-center gap-2 bg-subtle hover:bg-subtle transition-colors text-faint disabled:opacity-60"
        >
          {subiendo ? (
            <span className="text-sm font-bold">Subiendo...</span>
          ) : (
            <>
              <ImageOff size={28} />
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={14} /> Agregar foto del activo
              </span>
              <span className="text-[11px] text-faint">Se comprime sola, podes sacarla con el celular</span>
            </>
          )}
        </button>
      )}
      {err && <p className="text-xs font-bold text-danger bg-danger/10 border-t border-danger px-3 py-2">{err}</p>}
      {/* Sin atributo capture: deja elegir camara O galeria en mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};
