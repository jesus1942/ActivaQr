import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

function getExpFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export const DemoBanner: React.FC = () => {
  const { usuario, logout } = useAuth();
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);
  const [expirado, setExpirado] = useState(false);

  useEffect(() => {
    if (!usuario || usuario.email !== 'demo@activaqr.net') return;

    const token = localStorage.getItem('activaqr_token');
    if (!token) return;

    const exp = getExpFromToken(token);
    if (!exp) return;

    const calcular = () => {
      const ahora = Math.floor(Date.now() / 1000);
      const diff = exp - ahora;
      if (diff <= 0) {
        setExpirado(true);
        setMinutosRestantes(0);
      } else {
        setExpirado(false);
        setMinutosRestantes(Math.ceil(diff / 60));
      }
    };

    calcular();
    const intervalo = setInterval(calcular, 60 * 1000);
    return () => clearInterval(intervalo);
  }, [usuario]);

  if (!usuario || usuario.email !== 'demo@activaqr.net') return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] min-h-9 border-b border-brand-500/40 bg-slate-950/95 text-white backdrop-blur flex items-center justify-between gap-3 px-3 md:px-4 py-2 text-xs md:text-sm font-medium">
      <span style={{ color: '#f97316' }}>
        {expirado
          ? 'Sesion expirada'
          : minutosRestantes !== null
          ? `Sesion demo — quedan ${minutosRestantes} min`
          : 'Sesion demo'}
      </span>
      {expirado && (
        <button
          onClick={logout}
          className="flex-shrink-0 border border-brand-600 text-brand-400 px-3 py-0.5 text-xs font-bold hover:bg-brand-600 hover:text-white transition-colors"
        >
          Cerrar sesion
        </button>
      )}
    </div>
  );
};
