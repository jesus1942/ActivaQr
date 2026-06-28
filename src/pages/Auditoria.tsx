import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { getAuditoria, RegistroAuditoria } from '../data/indicadoresApi';
import { exportarCsv } from '../utils/exportCsv';
import { Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../data/planes';
import { FeatureLock } from '../components/FeatureLock';

const ACCION_LABEL: Record<string, string> = {
  crear: 'Creó',
  editar: 'Editó',
  eliminar: 'Eliminó',
  cerrar: 'Cerró',
  medicion: 'Registró medición',
  login: 'Inició sesión',
  acceso_remoto: 'Acceso remoto',
};

const ACCION_COLOR: Record<string, string> = {
  crear: 'bg-ok/10 text-ok-strong dark:text-ok border-ok',
  editar: 'bg-brand-50 dark:bg-brand-600/15 text-brand-700 dark:text-brand-300 border-brand-600',
  eliminar: 'bg-danger/10 text-danger-strong dark:text-danger border-danger',
  cerrar: 'bg-brand-50 dark:bg-brand-600/15 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-600',
  medicion: 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-500/50',
  login: 'bg-subtle text-muted border-line',
};

const ENTIDADES = ['', 'activo', 'medicion', 'orden_trabajo', 'documento', 'sesion'];

export const Auditoria: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [entidad, setEntidad] = useState('');
  const [error, setError] = useState('');
  const { usuario } = useAuth();

  const bloqueada = !hasFeature(usuario?.empresa?.plan, 'auditoria');

  useEffect(() => {
    if (bloqueada) return;
    getAuditoria(entidad ? { entidad } : undefined).then(setRegistros).catch((e) => setError(e.message));
  }, [entidad, bloqueada]);

  if (bloqueada) {
    return (
      <FeatureLock
        feature="auditoria"
        titulo="Auditoría"
        descripcion="Trazabilidad completa: quién creó, editó o eliminó cada activo, quién registró cada medición, quién accedió al soporte remoto. Indispensable para certificaciones y compliance."
      />
    );
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Auditoría</h1>
          <p className="text-muted text-sm mt-1">Trazabilidad de acciones — quién hizo qué y cuándo</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
            className="border border-line px-3 h-11 text-sm font-bold bg-surface outline-none"
          >
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>{e === '' ? 'Todas las entidades' : e.replace('_', ' ')}</option>
            ))}
          </select>
          <button
            onClick={() => exportarCsv('auditoria', registros.map((r) => ({
              Fecha: fmt(r.creadoEn), Usuario: r.usuarioNombre, Rol: r.usuarioRol ?? '',
              Accion: ACCION_LABEL[r.accion] ?? r.accion, Entidad: r.entidad, Detalle: r.detalle ?? '',
            })))}
            className="flex items-center gap-2 bg-surface text-content px-3 h-11 font-bold border border-line shadow-soft text-sm"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {error && <p className="text-danger font-bold">{error}</p>}

      <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft">
        {registros.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <ScrollText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin registros de auditoría todavía.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`text-xs font-black uppercase px-2 py-1 border whitespace-nowrap ${ACCION_COLOR[r.accion] ?? 'bg-subtle text-muted border-line'}`}>
                  {ACCION_LABEL[r.accion] ?? r.accion}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-content">
                    {r.detalle ?? r.entidad}
                  </p>
                  <p className="text-xs text-muted">
                    {r.usuarioNombre}{r.usuarioRol ? ` · ${r.usuarioRol}` : ''} · {r.entidad}
                  </p>
                </div>
                <span className="text-xs text-faint whitespace-nowrap">{fmt(r.creadoEn)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
