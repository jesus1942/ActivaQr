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
    if (!usuario || usuario.email !== 'demo@activaqr.com') return;

    const token = sessionStorage.getItem('activaqr_token');
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

  if (!usuario || usuario.email !== 'demo@activaqr.com') return null;

  return (
    <div className="w-full bg-warn text-[#1a1408] flex items-center justify-center gap-3 px-4 py-1.5 text-sm font-semibold fixed top-0 left-0 right-0 z-[70] safe-top">
      <span>
        {expirado
          ? 'Sesión expirada'
          : minutosRestantes !== null
          ? `Sesión demo — quedan ${minutosRestantes} min`
          : 'Sesión demo'}
      </span>
      {expirado && (
        <button
          onClick={logout}
          className="press border border-black/20 bg-white/30 text-[#1a1408] px-3 py-0.5 rounded-md text-xs font-bold hover:bg-white/60 transition-colors"
        >
          Cerrar sesión
        </button>
      )}
    </div>
  );
};
