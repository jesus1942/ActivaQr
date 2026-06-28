import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { activarNotificaciones, estadoNotificaciones } from '../data/push';
import { Button, Card } from './ui';

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
    <Card padding="md">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-brand-600" />
        <h2 className="font-display text-base font-bold text-content">Notificaciones push</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        Recibí avisos en este dispositivo aunque tengas la app cerrada: alertas de activos, mensajes y novedades.
      </p>
      {(estado === 'default' || estado === 'denied') && (
        <Button
          type="button"
          onClick={handleActivar}
          disabled={cargando || estado === 'denied'}
          loading={cargando}
        >
          Activar notificaciones
        </Button>
      )}
      {mensaje && <p className="text-sm font-semibold text-muted mt-3">{mensaje}</p>}
    </Card>
  );
};
