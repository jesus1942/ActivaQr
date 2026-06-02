import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { getAuditoria, RegistroAuditoria } from '../data/indicadoresApi';
import { exportarCsv } from '../utils/exportCsv';
import { Download } from 'lucide-react';

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
  crear: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  editar: 'bg-blue-100 text-blue-700 border-blue-300',
  eliminar: 'bg-red-100 text-red-700 border-red-300',
  cerrar: 'bg-orange-100 text-orange-700 border-orange-300',
  medicion: 'bg-violet-100 text-violet-700 border-violet-300',
  login: 'bg-slate-100 text-slate-600 border-slate-300',
};

const ENTIDADES = ['', 'activo', 'medicion', 'orden_trabajo', 'documento', 'sesion'];

export const Auditoria: React.FC = () => {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [entidad, setEntidad] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAuditoria(entidad ? { entidad } : undefined).then(setRegistros).catch((e) => setError(e.message));
  }, [entidad]);

  const fmt = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-sketch text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Auditoría</h1>
          <p className="text-slate-500 text-sm mt-1">Trazabilidad de acciones — quién hizo qué y cuándo</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={entidad}
            onChange={(e) => setEntidad(e.target.value)}
            className="border-2 border-slate-800 px-3 h-11 text-sm font-bold bg-white outline-none"
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
            className="flex items-center gap-2 bg-white text-slate-700 px-3 h-11 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] text-sm"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 font-bold">{error}</p>}

      <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]">
        {registros.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <ScrollText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Sin registros de auditoría todavía.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {registros.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                <span className={`text-xs font-black uppercase px-2 py-1 border-2 whitespace-nowrap ${ACCION_COLOR[r.accion] ?? 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                  {ACCION_LABEL[r.accion] ?? r.accion}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {r.detalle ?? r.entidad}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.usuarioNombre}{r.usuarioRol ? ` · ${r.usuarioRol}` : ''} · {r.entidad}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{fmt(r.creadoEn)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
