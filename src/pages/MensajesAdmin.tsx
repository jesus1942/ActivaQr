// v1.1.0
import React, { useEffect, useState, useCallback } from 'react';
import { MessageSquare, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { EmpresaAdmin, listarEmpresas } from '../data/adminApi';
import { PermisoAcceso, getPermisoAdmin } from '../data/accesoRemotoApi';
import { PanelAccesoRemoto } from '../components/PanelAccesoRemoto';
import { Button, Card } from '../components/ui';

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
    activo:   'text-ok-strong dark:text-ok',
    pendiente: 'text-warn-strong dark:text-warn',
    revocado: 'text-muted',
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight flex items-center gap-3">
            <MessageSquare size={28} /> Mensajes
          </h1>
          <p className="text-muted text-sm mt-1">Empresas con acceso remoto activo o pendiente</p>
        </div>
        <Button variant="secondary" size="sm" onClick={cargar} disabled={cargando} iconLeft={<RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />}>
          Actualizar
        </Button>
      </div>

      {cargando && <p className="text-faint animate-pulse">Cargando...</p>}

      {!cargando && conPermiso.length === 0 && (
        <div className="border border-line bg-subtle rounded-lg p-6 max-w-md">
          <p className="font-semibold text-content text-sm mb-2">Sin accesos remotos</p>
          <p className="text-sm text-muted">
            Cuando solicites acceso remoto a una empresa desde el panel de Empresas, aparecerá acá.
          </p>
        </div>
      )}

      <div className="space-y-2 max-w-lg">
        {conPermiso.map((emp) => {
          const permiso = permisos[emp.id]!;
          return (
            <Card
              key={emp.id}
              padding="sm"
              className="flex items-center justify-between gap-3 hover:border-line-strong"
            >
              <div>
                <p className="font-semibold text-content">{emp.nombre}</p>
                <p className="text-xs text-muted font-mono mt-0.5">{emp.plan}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold ${ESTADO_STYLE[permiso.estado] ?? ''}`}>
                  {permiso.estado}
                </span>
                {permiso.estado === 'activo' && (
                  <Button size="sm" onClick={() => setPanel({ empresa: emp, permiso })} iconLeft={<MonitorSmartphone size={14} />}>
                    Abrir chat
                  </Button>
                )}
                {permiso.estado === 'pendiente' && (
                  <span className="text-xs text-warn-strong dark:text-warn font-semibold">Esperando aprobación del cliente</span>
                )}
              </div>
            </Card>
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
