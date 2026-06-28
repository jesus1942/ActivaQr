// v1.1.0
import React, { useEffect, useState } from 'react';
import { MessageSquare, ShieldCheck, ShieldOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  PermisoAcceso, MensajeRemoto,
  getSolicitudCliente, revocarAccesoCliente,
  getMensajesCliente, enviarMensajeCliente,
  aprobarAccesoConToken,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from '../components/ChatRemoto';

export const Mensajes: React.FC = () => {
  const { usuario } = useAuth();
  const plan = usuario?.empresa?.plan ?? 'inicial';
  const planesConAcceso = ['empresa', 'industrial'];

  const [permiso, setPermiso] = useState<PermisoAcceso | null>(null);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [revocar, setRevocar] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [errAprobacion, setErrAprobacion] = useState('');

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

  const handleAprobar = async () => {
    if (!permiso?.token) return;
    setAprobando(true);
    setErrAprobacion('');
    try {
      const { permiso: updated } = await aprobarAccesoConToken(permiso.token);
      setPermiso(updated);
    } catch (e) {
      setErrAprobacion(e instanceof Error ? e.message : 'Error al aprobar el acceso.');
    } finally {
      setAprobando(false);
    }
  };

  const handleRevocar = async () => {
    await revocarAccesoCliente();
    setPermiso((p) => p ? { ...p, estado: 'revocado' } : p);
    setRevocar(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-black text-content uppercase tracking-tight flex items-center gap-3">
          <MessageSquare size={32} /> Mensajes
        </h1>
        <p className="text-muted text-sm mt-1">Comunicación con el equipo de soporte ActivaQR</p>
      </div>

      {cargando && (
        <p className="text-faint animate-pulse">Cargando...</p>
      )}

      {!cargando && !planesConAcceso.includes(plan) && (
        <div className="border border-line bg-subtle p-6 max-w-md">
          <p className="font-black text-muted uppercase text-sm mb-2">Función no disponible</p>
          <p className="text-sm text-muted">El chat de soporte remoto está disponible para los planes <strong>Empresa</strong> e <strong>Industrial</strong>.</p>
        </div>
      )}

      {!cargando && planesConAcceso.includes(plan) && !permiso && (
        <div className="border border-line bg-subtle p-6 max-w-md">
          <p className="font-black text-muted uppercase text-sm mb-2">Sin solicitudes activas</p>
          <p className="text-sm text-muted">Cuando el equipo de ActivaQR solicite acceso remoto, vas a poder comunicarte desde acá.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'revocado' && (
        <div className="border border-line bg-subtle p-6 max-w-md">
          <p className="font-black text-muted uppercase text-sm mb-2">Acceso revocado</p>
          <p className="text-sm text-muted">El acceso remoto fue revocado. Contactá al soporte si necesitás reactivarlo.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'pendiente' && (
        <div className="border border-warn bg-warn/10 p-5 max-w-lg space-y-4">
          <div>
            <p className="text-sm font-black text-warn-strong dark:text-warn uppercase tracking-wide mb-1">Solicitud de acceso pendiente</p>
            <p className="text-sm text-warn-strong dark:text-warn leading-relaxed">
              El equipo de ActivaQR solicitó acceso remoto para brindarte soporte técnico.
              {permiso.costoMensual ? ` Costo adicional: $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ' Sin costo adicional.'}
            </p>
          </div>

          <p className="text-xs text-warn-strong dark:text-warn leading-relaxed">
            Al aprobar, el soporte podrá ver tus activos, mediciones y comunicarse con vos desde la plataforma. Podés revocar el acceso en cualquier momento.
          </p>

          {errAprobacion && (
            <p className="text-xs font-bold text-danger bg-danger/10 border border-danger px-3 py-2">{errAprobacion}</p>
          )}

          <button
            onClick={handleAprobar}
            disabled={aprobando}
            className="w-full flex items-center justify-center gap-2 bg-warn text-white font-black uppercase tracking-wide text-sm border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all py-3 disabled:opacity-50 disabled:pointer-events-none"
          >
            <CheckCircle2 size={16} />
            {aprobando ? 'Aprobando...' : 'Aprobar acceso de soporte'}
          </button>
        </div>
      )}

      {!cargando && permiso?.estado === 'activo' && (
        <div className="space-y-4 max-w-lg">
          <div className="border border-ok bg-ok/10 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-ok-strong dark:text-ok uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} /> Acceso de soporte activo
              </p>
              <p className="text-xs text-ok-strong dark:text-ok mt-0.5">
                El soporte de ActivaQR puede ver tus activos y mediciones.
                {permiso.costoMensual ? ` $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
              </p>
            </div>
            {!revocar ? (
              <button
                onClick={() => setRevocar(true)}
                className="flex items-center gap-1 text-xs font-bold text-danger border border-danger px-3 py-2 hover:border-danger transition-colors whitespace-nowrap"
              >
                <ShieldOff size={13} /> Revocar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleRevocar} className="text-xs font-bold bg-danger text-white border border-danger px-3 py-2">Confirmar</button>
                <button onClick={() => setRevocar(false)} className="text-xs font-bold border border-line px-3 py-2">No</button>
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
