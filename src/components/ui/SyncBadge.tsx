/**
 * Badge visible que informa el estado de la sincronizacion offline.
 *
 * No se muestra si el usuario esta online y sin pendientes (no estorba).
 * Si hay pendientes, sigue visible aun online hasta drenar.
 */
import React from 'react';
import { CloudOff, UploadCloud, AlertTriangle } from 'lucide-react';
import { useEstadoSync } from '../../hooks/useEstadoSync';
import { useAuth } from '../../context/AuthContext';

export const SyncBadge: React.FC = () => {
  const { usuario } = useAuth();
  const { online, pendientes, drenando, errorSync, drenarAhora } = useEstadoSync();

  // Solo lo mostramos a usuarios logueados que cargan datos en campo.
  if (!usuario || usuario.rol === 'superadmin') return null;

  // Caso 1: online y nada pendiente → no estorbar.
  if (online && pendientes === 0) return null;

  // Caso 2: offline.
  if (!online) {
    return (
      <div className="w-full border border-line bg-slate-700 text-white flex items-center justify-between px-4 py-2 text-sm font-medium gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <CloudOff size={14} />
          Sin conexion — tus mediciones se guardan en el celular
        </span>
        {pendientes > 0 && (
          <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap bg-surface text-content px-2 py-0.5">
            {pendientes} pendiente{pendientes === 1 ? '' : 's'}
          </span>
        )}
      </div>
    );
  }

  // Caso 3: online + pendientes → drenando o aviso.
  if (errorSync && pendientes > 0) {
    return (
      <div className="w-full border border-line bg-warn text-white flex items-center justify-between px-4 py-2 text-sm font-medium gap-3">
        <span className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={14} />
          {pendientes} medicion{pendientes === 1 ? '' : 'es'} sin enviar — el servidor las rechazo
        </span>
        <button
          onClick={drenarAhora}
          className="text-xs font-black uppercase tracking-wider underline hover:no-underline whitespace-nowrap"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full border border-line bg-ok text-white flex items-center justify-between px-4 py-2 text-sm font-medium gap-3">
      <span className="flex items-center gap-2 font-semibold">
        <UploadCloud size={14} className={drenando ? 'animate-pulse' : ''} />
        {drenando
          ? `Enviando ${pendientes} medicion${pendientes === 1 ? '' : 'es'}...`
          : `Sincronizando ${pendientes} pendiente${pendientes === 1 ? '' : 's'}`}
      </span>
    </div>
  );
};
