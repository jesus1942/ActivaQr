import React, { useEffect, useState } from 'react';
import { MessageSquare, MonitorSmartphone } from 'lucide-react';
import { EmpresaAdmin, listarEmpresas } from '../data/adminApi';
import { PermisoAcceso, getPermisoAdmin } from '../data/accesoRemotoApi';
import { PanelAccesoRemoto } from '../components/PanelAccesoRemoto';

export const MensajesAdmin: React.FC = () => {
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [permisos, setPermisos] = useState<Record<string, PermisoAcceso | null>>({});
  const [cargando, setCargando] = useState(true);
  const [panel, setPanel] = useState<{ empresa: EmpresaAdmin; permiso: PermisoAcceso } | null>(null);

  useEffect(() => {
    listarEmpresas()
      .then(async (lista) => {
        setEmpresas(lista);
        const compatibles = lista.filter((e) => ['empresa', 'industrial'].includes(e.plan));
        const entries = await Promise.all(
          compatibles.map(async (e) => {
            try { return [e.id, await getPermisoAdmin(e.id)] as [string, PermisoAcceso | null]; }
            catch { return [e.id, null] as [string, null]; }
          })
        );
        setPermisos(Object.fromEntries(entries));
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const conPermiso = empresas.filter(
    (e) => permisos[e.id] && permisos[e.id]!.estado !== 'revocado'
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
          <MessageSquare size={32} /> Mensajes
        </h1>
        <p className="text-slate-500 text-sm mt-1">Empresas con acceso remoto activo o pendiente</p>
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
                <span className={`text-xs font-black uppercase px-2 py-1 border-2 ${
                  permiso.estado === 'activo'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                    : 'bg-amber-50 border-amber-400 text-amber-700'
                }`}>
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
