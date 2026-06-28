import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  abierto: boolean;
  titulo: string;
  label: string;
  placeholder?: string;
  onCerrar: () => void;
  onCrear: (nombre: string) => void;
}

export const ModalCrearRapido: React.FC<Props> = ({
  abierto, titulo, label, placeholder, onCerrar, onCrear,
}) => {
  const [nombre, setNombre] = useState('');

  if (!abierto) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return;
    onCrear(limpio);
    setNombre('');
  };

  const cerrar = () => {
    setNombre('');
    onCerrar();
  };

  return (
    <div className="fixed inset-0 bg-content/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-surface border border-line shadow-soft w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border border-line bg-content text-white">
          <h3 className="font-black uppercase tracking-wide text-sm">{titulo}</h3>
          <button type="button" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">{label}</label>
            <input
              type="text"
              required
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={placeholder}
              className="w-full border border-line px-3 h-11 text-sm outline-none focus:border-brand-600"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cerrar}
              className="px-4 min-h-[44px] border border-line-strong font-bold text-muted text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft text-sm"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
