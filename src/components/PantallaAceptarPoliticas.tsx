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
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[92vh] overflow-y-auto">
        <div className="bg-orange-500 px-6 py-4 border-b-4 border-slate-900">
          <h1 className="font-sketch font-black text-white text-2xl uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck size={26} /> Aceptacion de politicas
          </h1>
          <p className="text-white text-sm font-semibold mt-1 opacity-95">
            Necesitamos tu aceptacion para continuar.
          </p>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-slate-700 text-sm leading-relaxed">
            Para seguir usando ActivaQR y antes de activar tu suscripcion, necesitamos que leas y
            aceptes la <strong>Politica de Uso</strong> y la <strong>Politica de Privacidad</strong>.
            La aceptacion queda registrada con fecha, hora e IP, conforme a la Ley 25.326.
          </p>

          {!esAdmin && (
            <div className="bg-red-50 border-2 border-red-300 p-3 flex gap-2">
              <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-semibold">
                Solo el administrador de la empresa puede aceptar las politicas. Pedile que ingrese y las acepte.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <a
              href={`${API_BASE}/politica-uso`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-2 border-slate-300 hover:border-orange-500 px-4 py-3 transition-colors group"
            >
              <span className="text-sm font-bold text-slate-700 group-hover:text-orange-600">
                Leer Politica de Uso
              </span>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-orange-500" />
            </a>
            <a
              href={`${API_BASE}/politica-privacidad`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border-2 border-slate-300 hover:border-orange-500 px-4 py-3 transition-colors group"
            >
              <span className="text-sm font-bold text-slate-700 group-hover:text-orange-600">
                Leer Politica de Privacidad
              </span>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-orange-500" />
            </a>
          </div>

          <div className="space-y-2 pt-2 border-t-2 border-slate-100">
            <label className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${esAdmin ? 'border-slate-300 hover:border-orange-400' : 'border-slate-200 opacity-50 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={aceptoUso}
                onChange={(e) => setAceptoUso(e.target.checked)}
                disabled={!esAdmin}
                className="mt-0.5 w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-slate-700">
                Lei y acepto la <strong>Politica de Uso</strong> de ActivaQR.
              </span>
            </label>
            <label className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition-colors ${esAdmin ? 'border-slate-300 hover:border-orange-400' : 'border-slate-200 opacity-50 cursor-not-allowed'}`}>
              <input
                type="checkbox"
                checked={aceptoPriv}
                onChange={(e) => setAceptoPriv(e.target.checked)}
                disabled={!esAdmin}
                className="mt-0.5 w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-slate-700">
                Lei y acepto la <strong>Politica de Privacidad</strong> y autorizo el tratamiento de
                datos personales descripto en ella.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={logout}
              className="px-4 py-3 border-2 border-slate-400 font-bold text-slate-600 hover:border-slate-700 transition-colors text-sm uppercase tracking-wide"
            >
              Cerrar sesion
            </button>
            <button
              onClick={handleAceptar}
              disabled={!puedeAceptar}
              className="flex-1 bg-orange-500 text-white font-sketch font-black text-lg uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] py-3 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#1e293b] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0px_0px_#1e293b]"
            >
              {enviando ? 'Registrando...' : 'Acepto y continuo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
