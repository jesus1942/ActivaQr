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
    <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-orange-500" />
        <h2 className="font-sketch text-xl font-black text-slate-900 uppercase">Notificaciones push</h2>
      </div>
      <p className="text-sm text-slate-600 mb-3">
        Recibí avisos en este dispositivo aunque tengas la app cerrada: alertas de activos, mensajes y novedades.
      </p>
      {(estado === 'default' || estado === 'denied') && (
        <button
          onClick={handleActivar}
          disabled={cargando || estado === 'denied'}
          className="bg-orange-500 text-white px-4 min-h-[44px] font-bold uppercase border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50"
        >
          {cargando ? 'Activando...' : 'Activar notificaciones'}
        </button>
      )}
      {mensaje && <p className="text-sm font-bold text-slate-700 mt-2">{mensaje}</p>}
    </div>
  );
};
