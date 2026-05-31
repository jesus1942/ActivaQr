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
    activo:   'bg-emerald-50 border-emerald-400 text-emerald-700',
    pendiente: 'bg-amber-50 border-amber-400 text-amber-700',
    revocado: 'bg-slate-100 border-slate-300 text-slate-500',
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <MessageSquare size={32} /> Mensajes
          </h1>
          <p className="text-slate-500 text-sm mt-1">Empresas con acceso remoto activo o pendiente</p>
        </div>
        <button
          onClick={cargar}
          disabled={cargando}
          className="flex items-center gap-2 border-2 border-slate-300 px-3 py-2 text-sm font-bold hover:border-slate-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {cargando && <p className="text-slate-400 animate-pulse">Cargando...</p>}

      {!cargando && conPermiso.length === 0 && (
        <div className="border-2 border-slate-200 bg-slate-50 p-6 max-w-md">
          <p className="font-black text-slate-600 uppercase text-sm mb-2">Sin accesos remotos</p>
          <p className="text-sm text-slate-500">
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
              className="bg-white border-2 border-slate-200 p-4 flex items-center justify-between gap-3 hover:border-slate-400 transition-colors"
            >
              <div>
                <p className="font-black text-slate-900">{emp.nombre}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.plan}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black uppercase px-2 py-1 border-2 ${ESTADO_STYLE[permiso.estado] ?? ''}`}>
                  {permiso.estado}
                </span>
                {permiso.estado === 'activo' && (
                  <button
                    onClick={() => setPanel({ empresa: emp, permiso })}
                    className="flex items-center gap-1.5 text-xs font-bold border-2 border-slate-900 px-3 py-2 bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                  >
                    <MonitorSmartphone size={14} /> Abrir chat
                  </button>
                )}
                {permiso.estado === 'pendiente' && (
                  <span className="text-xs text-amber-600 font-semibold">Esperando aprobación del cliente</span>
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
