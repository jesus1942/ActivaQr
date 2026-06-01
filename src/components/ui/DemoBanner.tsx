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
    <div className="w-full border-b-2 border-black bg-gray-900 text-white flex items-center justify-between px-4 py-2 text-sm font-medium">
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
          className="ml-4 border-2 border-orange-500 text-orange-400 px-3 py-0.5 text-xs font-bold hover:bg-orange-500 hover:text-white transition-colors"
        >
          Cerrar sesion
        </button>
      )}
    </div>
  );
};
