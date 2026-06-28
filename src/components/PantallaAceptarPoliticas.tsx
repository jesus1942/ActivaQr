import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, AlertTriangle } from 'lucide-react';
import { aceptarPoliticas } from '../data/cuentaApi';
import { useAuth } from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

interface Props {
  onAceptada: () => void;
}

export const PantallaAceptarPoliticas: React.FC<Props> = ({ onAceptada }) => {
  const { logout, usuario } = useAuth();
  const [aceptoUso, setAceptoUso] = useState(false);
  const [aceptoPriv, setAceptoPriv] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esAdmin = usuario?.rol === 'admin';
  const puedeAceptar = aceptoUso && aceptoPriv && !enviando && esAdmin;

  const handleAceptar = async () => {
    if (!puedeAceptar) return;
    setEnviando(true);
    setError(null);
    try {
      await aceptarPoliticas();
      onAceptada();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron aceptar las politicas.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="bg-brand-600 px-6 py-4 border-b-4 border-line">
          <h1 className="font-display font-black text-white text-2xl uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck size={26} /> Aceptacion de politicas
          </h1>
          <p className="text-white text-sm font-semibold mt-1 opacity-95">
            Necesitamos tu aceptacion para continuar.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-content text-sm leading-relaxed">
            Para seguir usando ActivaQR y antes de activar tu suscripcion, necesitamos que leas y
            aceptes la <strong>Politica de Uso</strong> y la <strong>Politica de Privacidad</strong>.
            La aceptacion queda registrada con fecha, hora e IP, conforme a la Ley 25.326.
          </p>

          {!esAdmin && (
            <div className="bg-danger/10 border border-danger p-3 flex gap-2">
              <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger-strong dark:text-danger font-semibold">
                Solo el administrador de la empresa puede aceptar las politicas. Pedile que ingrese y las acepte.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <a
              href={`${API_BASE}/politica-uso`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-line hover:border-brand-600 px-4 py-3 transition-colors group"
            >
              <span className="text-sm font-bold text-content group-hover:text-brand-600">
                Leer Politica de Uso
              </span>
              <ExternalLink size={16} className="text-faint group-hover:text-brand-600" />
            </a>
            <a
              href={`${API_BASE}/politica-privacidad`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-line hover:border-brand-600 px-4 py-3 transition-colors group"
            >
              <span className="text-sm font-bold text-content group-hover:text-brand-600">
                Leer Politica de Privacidad
              </span>
              <ExternalLink size={16} className="text-faint group-hover:text-brand-600" />
            </a>
          </div>

          <div className="space-y-2 pt-2 border border-line">
            <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${esAdmin ? 'border-line hover:border-brand-600' : 'border-line opacity-50 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={aceptoUso}
                onChange={(e) => setAceptoUso(e.target.checked)}
                disabled={!esAdmin}
                className="mt-0.5 w-4 h-4 accent-brand-600"
              />
              <span className="text-sm text-content">
                Lei y acepto la <strong>Politica de Uso</strong> de ActivaQR.
              </span>
            </label>
            <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${esAdmin ? 'border-line hover:border-brand-600' : 'border-line opacity-50 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={aceptoPriv}
                onChange={(e) => setAceptoPriv(e.target.checked)}
                disabled={!esAdmin}
                className="mt-0.5 w-4 h-4 accent-brand-600"
              />
              <span className="text-sm text-content">
                Lei y acepto la <strong>Politica de Privacidad</strong> y autorizo el tratamiento de
                datos personales descripto en ella.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger px-3 py-2 text-sm font-semibold text-danger-strong dark:text-danger">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={logout}
              className="px-4 py-3 border border-line-strong font-bold text-muted hover:border-content transition-colors text-sm uppercase tracking-wide"
            >
              Cerrar sesion
            </button>
            <button
              onClick={handleAceptar}
              disabled={!puedeAceptar}
              className="flex-1 bg-brand-600 text-white font-display font-black text-lg uppercase border border-line shadow-soft py-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-soft transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-soft"
            >
              {enviando ? 'Registrando...' : 'Acepto y continuo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
