// v1.1.0
import React, { useEffect, useState } from 'react';
import { MessageSquare, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PermisoAcceso, MensajeRemoto,
  getSolicitudCliente, revocarAccesoCliente,
  getMensajesCliente, enviarMensajeCliente,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from '../components/ChatRemoto';
import { Button } from '../components/ui';

export const Mensajes: React.FC = () => {
  const { usuario } = useAuth();
  const plan = usuario?.empresa?.plan ?? 'inicial';
  const planesConAcceso = ['empresa', 'industrial'];

  const [permiso, setPermiso] = useState<PermisoAcceso | null>(null);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [revocar, setRevocar] = useState(false);

  useEffect(() => {
    if (!planesConAcceso.includes(plan)) { setCargando(false); return; }
    getSolicitudCliente()
      .then(setPermiso)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [plan]);

  useEffect(() => {
    if (permiso?.estado !== 'activo') return;
    getMensajesCliente().then(setMensajes).catch(() => {});
    const iv = setInterval(() => getMensajesCliente().then(setMensajes).catch(() => {}), 8000);
    return () => clearInterval(iv);
  }, [permiso?.estado]);

  const handleRevocar = async () => {
    await revocarAccesoCliente();
    setPermiso((p) => p ? { ...p, estado: 'revocado' } : p);
    setRevocar(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight flex items-center gap-3">
          <MessageSquare size={28} /> Mensajes
        </h1>
        <p className="text-muted text-sm mt-1">Comunicación con el equipo de soporte ActivaQR</p>
      </div>

      {cargando && (
        <p className="text-faint animate-pulse">Cargando...</p>
      )}

      {!cargando && !planesConAcceso.includes(plan) && (
        <div className="border border-line bg-subtle rounded-lg p-6 max-w-md">
          <p className="font-semibold text-content text-sm mb-2">Función no disponible</p>
          <p className="text-sm text-muted">El chat de soporte remoto está disponible para los planes <strong>Empresa</strong> e <strong>Industrial</strong>.</p>
        </div>
      )}

      {!cargando && planesConAcceso.includes(plan) && !permiso && (
        <div className="border border-line bg-subtle rounded-lg p-6 max-w-md">
          <p className="font-semibold text-content text-sm mb-2">Sin solicitudes activas</p>
          <p className="text-sm text-muted">Cuando el equipo de ActivaQR solicite acceso remoto, vas a poder comunicarte desde acá.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'revocado' && (
        <div className="border border-line bg-subtle rounded-lg p-6 max-w-md">
          <p className="font-semibold text-content text-sm mb-2">Acceso revocado</p>
          <p className="text-sm text-muted">El acceso remoto fue revocado. Contactá al soporte si necesitás reactivarlo.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'pendiente' && (
        <div className="border-l-2 border-warn bg-warn/10 rounded-md p-5 max-w-lg space-y-3">
          <p className="text-sm font-semibold text-warn-strong dark:text-warn uppercase tracking-wide">Solicitud de acceso pendiente</p>
          <p className="text-sm text-warn-strong dark:text-warn leading-relaxed">
            El equipo de ActivaQR solicitó acceso remoto para brindarte soporte.
            {permiso.costoMensual ? ` Costo adicional: $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
          </p>
          <p className="text-xs text-warn-strong/80 dark:text-warn/80">Revisá tu email para encontrar el link de aprobación.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'activo' && (
        <div className="space-y-4 max-w-lg">
          <div className="border-l-2 border-ok bg-ok/10 rounded-md px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ok-strong dark:text-ok uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} /> Acceso de soporte activo
              </p>
              <p className="text-xs text-ok-strong/80 dark:text-ok/80 mt-0.5">
                El soporte de ActivaQR puede ver tus activos y mediciones.
                {permiso.costoMensual ? ` $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
              </p>
            </div>
            {!revocar ? (
              <Button variant="ghost" size="sm" iconLeft={<ShieldOff size={13} />} className="text-danger hover:text-danger whitespace-nowrap" onClick={() => setRevocar(true)}>
                Revocar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={handleRevocar}>Confirmar</Button>
                <Button variant="secondary" size="sm" onClick={() => setRevocar(false)}>No</Button>
              </div>
            )}
          </div>

          <ChatRemoto
            mensajes={mensajes}
            miRol="cliente"
            onEnviar={async (payload) => {
              const m = await enviarMensajeCliente(payload);
              setMensajes((prev) => [...prev, m]);
            }}
          />
        </div>
      )}
    </div>
  );
};
