// v1.1.0
import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { EmpresaAdmin, listarEmpresas } from '../data/adminApi';
import { PermisoAcceso, getPermisoAdmin } from '../data/accesoRemotoApi';
import { PanelAccesoRemoto } from '../components/PanelAccesoRemoto';

export const MensajesAdmin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [permisos, setPermisos] = useState<Record<string, PermisoAcceso | null>>({});
  const [cargando, setCargando] = useState(true);
  const [panel, setPanel] = useState<{ empresa: EmpresaAdmin; permiso: PermisoAcceso } | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await listarEmpresas();
      setEmpresas(lista);
      // Cargar permisos de TODAS las empresas (no solo empresa/industrial)
      // porque el plan puede cambiar y el permiso puede estar activo igual.
      const entries = await Promise.all(
        lista.map(async (e) => {
          try { return [e.id, await getPermisoAdmin(e.id)] as [string, PermisoAcceso | null]; }
          catch { return [e.id, null] as [string, null]; }
        })
      );
      setPermisos(Object.fromEntries(entries));
    } catch {}
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Solo mostrar las que tienen permiso no revocado.
  const conPermiso = empresas.filter(
    (e) => permisos[e.id] != null && permisos[e.id]!.estado !== 'revocado'
  );

  const ESTADO_STYLE: Record<string, string> = {
    activo:   'bg-ok/10 border-ok text-ok-strong dark:text-ok',
    pendiente: 'bg-warn/10 border-warn text-warn-strong dark:text-warn',
    revocado: 'bg-subtle border-line text-muted',
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-content uppercase tracking-tight flex items-center gap-3">
            <MessageSquare size={32} /> Mensajes
          </h1>
          <p className="text-muted text-sm mt-1">Empresas con acceso remoto activo o pendiente</p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-2 border border-line px-3 py-2 text-sm font-bold hover:border-content transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {cargando && <p className="text-faint animate-pulse">Cargando...</p>}

      {!cargando && conPermiso.length === 0 && (
        <div className="border border-line bg-subtle p-6 max-w-md">
          <p className="font-black text-muted uppercase text-sm mb-2">Sin accesos remotos</p>
          <p className="text-sm text-muted">
            Cuando solicites acceso remoto a una empresa desde el panel de Empresas, aparecerá acá.
          </p>
        </div>
      )}

      <div className="space-y-2 max-w-lg">
        {conPermiso.map((emp) => {
          const permiso = permisos[emp.id]!;
          return (
            <div
              key={emp.id}
              className="bg-surface/85 backdrop-blur-xl border border-line p-4 flex items-center justify-between gap-3 hover:border-content transition-colors"
            >
              <div>
                <p className="font-black text-content">{emp.nombre}</p>
                <p className="text-xs text-muted font-mono mt-0.5">{emp.plan}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black uppercase px-2 py-1 border ${ESTADO_STYLE[permiso.estado] ?? ''}`}>
                  {permiso.estado}
                </span>
                {permiso.estado === 'activo' && (
                  <button
                    onClick={() => setPanel({ empresa: emp, permiso })}
                    className="flex items-center gap-1.5 text-xs font-bold border border-line px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <MonitorSmartphone size={14} /> Abrir chat
                  </button>
                )}
                {permiso.estado === 'pendiente' && (
                  <span className="text-xs text-warn-strong dark:text-warn font-semibold">Esperando aprobación del cliente</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {panel && (
        <PanelAccesoRemoto
          empresaId={panel.empresa.id}
          empresaNombre={panel.empresa.nombre}
          permiso={panel.permiso}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  );
};
