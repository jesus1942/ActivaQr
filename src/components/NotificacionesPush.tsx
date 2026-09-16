import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';
import { activarNotificaciones, probarNotificaciones, verificarNotificaciones, type EstadoPush } from '../data/push';

export const NotificacionesPush: React.FC = () => {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensajePrueba, setMensajePrueba] = useState('');

  const refrescar = async () => setEstado(await verificarNotificaciones());

  useEffect(() => { void refrescar(); }, []);

  const handleActivar = async () => {
    setCargando(true);
    setMensajePrueba('');
    await activarNotificaciones();
    await refrescar();
    setCargando(false);
  };

  const handlePrueba = async () => {
    setCargando(true);
    setMensajePrueba('');
    const ok = await probarNotificaciones();
    setMensajePrueba(ok
      ? 'Prueba enviada. Si el sistema está correcto, debería aparecer en este dispositivo incluso con la PWA cerrada.'
      : 'La prueba no pudo enviarse. Revisá el estado indicado abajo.');
    await refrescar();
    setCargando(false);
  };

  const listo = Boolean(estado?.listo);
  let mensaje = 'Comprobando el estado real de este dispositivo…';
  if (estado) {
    if (!estado.soportado) mensaje = 'Este navegador no ofrece Web Push. En iPhone debe usarse la PWA instalada en la pantalla de inicio.';
    else if (estado.permiso === 'denied') mensaje = 'iOS bloqueó las notificaciones para ActivaQR. Habilitalas desde Ajustes > Notificaciones.';
    else if (estado.permiso === 'granted' && !estado.suscriptoNavegador) mensaje = 'iOS dio permiso, pero este iPhone no tiene una suscripción Web Push activa. Volvé a registrarlo.';
    else if (estado.suscriptoNavegador && !estado.suscriptoServidor) mensaje = 'El iPhone tiene una suscripción, pero el servidor de ActivaQR no la tiene registrada. Volvé a activarla.';
    else if (!estado.servidorConfigurado) mensaje = 'El servidor no tiene Web Push operativo en este momento.';
    else if (listo) mensaje = 'Este dispositivo está registrado en iOS y en ActivaQR. Las notificaciones están realmente habilitadas.';
    else mensaje = 'Las notificaciones todavía no están completamente configuradas en este dispositivo.';
  }

  return (
    <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-5 h-5 text-brand-600" />
        <h2 className="font-display text-xl font-black text-content uppercase">Notificaciones push</h2>
      </div>
      <p className="text-sm text-muted mb-3">
        El permiso del sistema no alcanza: ActivaQR comprueba también que este dispositivo esté suscripto y registrado en producción.
      </p>

      <div className={`flex items-start gap-2 border p-3 ${listo ? 'border-ok bg-ok/10' : 'border-warn bg-warn/10'}`}>
        {listo ? <CheckCircle2 size={18} className="text-ok-strong mt-0.5" /> : <AlertTriangle size={18} className="text-warn-strong mt-0.5" />}
        <div>
          <p className="text-sm font-bold text-content">{mensaje}</p>
          {estado?.error && <p className="mt-1 text-xs text-muted">Diagnóstico: {estado.error}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!listo && estado?.permiso !== 'denied' && estado?.soportado !== false && (
          <button
            onClick={handleActivar}
            disabled={cargando}
            className="bg-brand-600 text-white px-4 min-h-[44px] font-bold uppercase border border-line shadow-soft disabled:opacity-50"
          >
            {cargando ? 'Registrando…' : 'Activar / reparar notificaciones'}
          </button>
        )}
        {listo && (
          <button
            onClick={handlePrueba}
            disabled={cargando}
            className="bg-slate-900 text-white px-4 min-h-[44px] font-bold uppercase border border-line shadow-soft disabled:opacity-50"
          >
            {cargando ? 'Enviando…' : 'Enviar notificación de prueba'}
          </button>
        )}
        <button onClick={() => void refrescar()} disabled={cargando} className="px-4 min-h-[44px] font-bold uppercase border border-line text-content disabled:opacity-50">
          Verificar de nuevo
        </button>
      </div>

      {mensajePrueba && <p className="text-sm font-bold text-content mt-3">{mensajePrueba}</p>}
    </div>
  );
};
