import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { activarNotificaciones, estadoNotificaciones } from '../data/push';

export const NotificacionesPush: React.FC = () => {
  const [estado, setEstado] = useState<NotificationPermission | 'unsupported'>('default');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setEstado(estadoNotificaciones());
  }, []);

  const handleActivar = async () => {
    setCargando(true);
    const ok = await activarNotificaciones();
    setEstado(estadoNotificaciones());
    if (ok) setEstado('granted');
    setCargando(false);
  };

  let mensaje = '';
  if (estado === 'unsupported') mensaje = 'Tu navegador no soporta notificaciones push.';
  else if (estado === 'granted') mensaje = 'Notificaciones activadas en este dispositivo.';
  else if (estado === 'denied') mensaje = 'Notificaciones bloqueadas. Habilitalas desde los ajustes del navegador.';

  return (
    <div className="bg-surface border border-line shadow-soft p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-brand-600" />
        <h2 className="font-display text-xl font-black text-content uppercase">Notificaciones push</h2>
      </div>
      <p className="text-sm text-muted mb-3">
        Recibí avisos en este dispositivo aunque tengas la app cerrada: alertas de activos, mensajes y novedades.
      </p>
      {(estado === 'default' || estado === 'denied') && (
        <button
          onClick={handleActivar}
          disabled={cargando || estado === 'denied'}
          className="bg-brand-600 text-white px-4 min-h-[44px] font-bold uppercase border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
        >
          {cargando ? 'Activando...' : 'Activar notificaciones'}
        </button>
      )}
      {mensaje && <p className="text-sm font-bold text-content mt-2">{mensaje}</p>}
    </div>
  );
};
