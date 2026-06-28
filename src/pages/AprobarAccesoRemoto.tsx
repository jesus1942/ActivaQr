// v1.1.0
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { aprobarAccesoConToken } from '../data/accesoRemotoApi';

export const AprobarAccesoRemoto: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    aprobarAccesoConToken(token)
      .then(() => setEstado('ok'))
      .catch((e) => { setEstado('error'); setMsg(e.message); });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-900 shadow-soft max-w-md w-full">
        <div className="bg-brand-600 px-6 py-4 border-b border-slate-900">
          <p className="text-xs font-bold text-white uppercase tracking-widest">ActivaQR</p>
          <h1 className="font-bold text-white text-xl uppercase tracking-wide mt-1">Acceso remoto</h1>
        </div>
        <div className="p-6">
          {estado === 'cargando' && (
            <p className="text-slate-500 font-semibold animate-pulse">Procesando...</p>
          )}
          {estado === 'ok' && (
            <div className="space-y-3">
              <p className="font-bold text-slate-900 text-lg">¡Acceso aprobado!</p>
              <p className="text-slate-600 text-sm leading-relaxed">
                El equipo de soporte de ActivaQR ahora puede ver tus activos y comunicarse con vos.
                Podés revocar este acceso en cualquier momento desde <strong>Configuración → Acceso remoto</strong>.
              </p>
            </div>
          )}
          {estado === 'error' && (
            <div className="space-y-3">
              <p className="font-bold text-slate-900 text-lg">Link inválido o expirado</p>
              <p className="text-slate-600 text-sm">{msg || 'Este link ya no es válido. Contactá al soporte.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
