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
        <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <MessageSquare size={32} /> Mensajes
        </h1>
        <p className="text-slate-500 text-sm mt-1">Comunicación con el equipo de soporte ActivaQR</p>
      </div>

      {cargando && (
        <p className="text-slate-400 animate-pulse">Cargando...</p>
      )}

      {!cargando && !planesConAcceso.includes(plan) && (
        <div className="border-2 border-slate-200 bg-slate-50 p-6 max-w-md">
          <p className="font-black text-slate-600 uppercase text-sm mb-2">Función no disponible</p>
          <p className="text-sm text-slate-500">El chat de soporte remoto está disponible para los planes <strong>Empresa</strong> e <strong>Industrial</strong>.</p>
        </div>
      )}

      {!cargando && planesConAcceso.includes(plan) && !permiso && (
        <div className="border-2 border-slate-200 bg-slate-50 p-6 max-w-md">
          <p className="font-black text-slate-600 uppercase text-sm mb-2">Sin solicitudes activas</p>
          <p className="text-sm text-slate-500">Cuando el equipo de ActivaQR solicite acceso remoto, vas a poder comunicarte desde acá.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'revocado' && (
        <div className="border-2 border-slate-200 bg-slate-50 p-6 max-w-md">
          <p className="font-black text-slate-600 uppercase text-sm mb-2">Acceso revocado</p>
          <p className="text-sm text-slate-500">El acceso remoto fue revocado. Contactá al soporte si necesitás reactivarlo.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'pendiente' && (
        <div className="border-2 border-amber-400 bg-amber-50 p-5 max-w-lg space-y-3">
          <p className="text-sm font-black text-amber-700 uppercase tracking-wide">Solicitud de acceso pendiente</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            El equipo de ActivaQR solicitó acceso remoto para brindarte soporte.
            {permiso.costoMensual ? ` Costo adicional: $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
          </p>
          <p className="text-xs text-amber-600">Revisá tu email para encontrar el link de aprobación.</p>
        </div>
      )}

      {!cargando && permiso?.estado === 'activo' && (
        <div className="space-y-4 max-w-lg">
          <div className="border-2 border-emerald-400 bg-emerald-50 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck size={14} /> Acceso de soporte activo
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                El soporte de ActivaQR puede ver tus activos y mediciones.
                {permiso.costoMensual ? ` $${permiso.costoMensual.toLocaleString('es-AR')}/mes.` : ''}
              </p>
            </div>
            {!revocar ? (
              <button
                onClick={() => setRevocar(true)}
                className="flex items-center gap-1 text-xs font-bold text-red-600 border-2 border-red-300 px-3 py-2 hover:border-red-600 transition-colors whitespace-nowrap"
              >
                <ShieldOff size={13} /> Revocar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleRevocar} className="text-xs font-bold bg-red-600 text-white border-2 border-red-800 px-3 py-2">Confirmar</button>
                <button onClick={() => setRevocar(false)} className="text-xs font-bold border-2 border-slate-300 px-3 py-2">No</button>
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
