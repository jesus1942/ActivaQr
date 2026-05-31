/**
 * Panel de acceso remoto que usa el superadmin para ver activos,
 * mediciones y chatear con un cliente que otorgó permiso.
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  PermisoAcceso, MensajeRemoto,
  getActivosRemoto, getMensajesAdmin, enviarMensajeAdmin,
  crearTareaRemota,
} from '../data/accesoRemotoApi';
import { ChatRemoto } from './ChatRemoto';

const ESTADO_COLOR: Record<string, string> = {
  normal:        'bg-emerald-50 border-emerald-400 text-emerald-700',
  alerta:        'bg-amber-50 border-amber-400 text-amber-700',
  critico:       'bg-red-50 border-red-500 text-red-700',
  mantenimiento: 'bg-blue-50 border-blue-400 text-blue-700',
};

interface Props {
  empresaId: string;
  empresaNombre: string;
  permiso: PermisoAcceso;
  onClose: () => void;
}

export const PanelAccesoRemoto: React.FC<Props> = ({ empresaId, empresaNombre, permiso, onClose }) => {
  const [tab, setTab] = useState<'activos' | 'chat'>('activos');
  const [activos, setActivos] = useState<any[]>([]);
  const [mensajes, setMensajes] = useState<MensajeRemoto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [activoTarea, setActivoTarea] = useState<string | null>(null);
  const [formTarea, setFormTarea] = useState({ tipo: '', fechaProgramada: format(new Date(), 'yyyy-MM-dd'), observaciones: '' });
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  useEffect(() => {
    setCargando(true);
    getActivosRemoto(empresaId).then(setActivos).finally(() => setCargando(false));
  }, [empresaId]);

  useEffect(() => {
    if (tab !== 'chat') return;
    getMensajesAdmin(empresaId).then(setMensajes).catch(() => {});
    const iv = setInterval(() => getMensajesAdmin(empresaId).then(setMensajes).catch(() => {}), 8000);
    return () => clearInterval(iv);
  }, [tab, empresaId]);

  const handleCrearTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activoTarea || !formTarea.tipo) return;
    setGuardandoTarea(true);
    try {
      await crearTareaRemota(empresaId, { activoId: activoTarea, ...formTarea });
      setActivoTarea(null);
      setFormTarea({ tipo: '', fechaProgramada: format(new Date(), 'yyyy-MM-dd'), observaciones: '' });
    } finally {
      setGuardandoTarea(false);
    }
  };

  const criticos = activos.filter((a) => a.estado === 'critico').length;
  const alertas  = activos.filter((a) => a.estado === 'alerta').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center p-2 sm:p-6 overflow-y-auto">
      <div className="bg-white border-2 border-slate-900 shadow-[6px_6px_0px_0px_#1e293b] w-full max-w-3xl my-4">

        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p className="text-xs font-black text-orange-400 uppercase tracking-wider">Acceso remoto</p>
            <h2 className="font-black text-lg uppercase leading-tight">{empresaNombre}</h2>
          </div>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-3 border-b-2 border-slate-100 flex gap-4 flex-wrap text-sm">
          <span className="font-semibold text-slate-600">{activos.length} activos</span>
          {criticos > 0 && <span className="font-black text-red-600">⚠ {criticos} críticos</span>}
          {alertas > 0  && <span className="font-black text-amber-600">! {alertas} en alerta</span>}
          <span className={`ml-auto text-xs font-black uppercase px-2 py-1 border-2 ${
            permiso.estado === 'activo' ? 'border-emerald-400 text-emerald-700 bg-emerald-50' : 'border-slate-300 text-slate-500'
          }`}>
            {permiso.estado}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-slate-200">
          {(['activos', 'chat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-black uppercase tracking-wide transition-colors ${
                tab === t ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'activos' ? 'Activos' : 'Chat'}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'activos' && (
            <div className="space-y-2">
              {cargando && <p className="text-sm text-slate-400 animate-pulse py-4 text-center">Cargando activos...</p>}
              {!cargando && activos.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Sin activos registrados.</p>}
              {activos.map((a) => (
                <div key={a.id} className="border-2 border-slate-200 p-3 flex items-start justify-between gap-3 hover:border-slate-400 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500">{a.codigo}</span>
                      <span className={`text-xs font-black uppercase px-1.5 py-0.5 border ${ESTADO_COLOR[a.estado] ?? ''}`}>
                        {a.estado}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{a.nombre}</p>
                    <p className="text-xs text-slate-500">{a.sector?.nombre} · {a.tipo?.nombre}</p>
                    {a.mediciones?.[0] && (
                      <p className="text-xs text-slate-500 mt-1">
                        Última medición: {a.mediciones[0].temperatura != null ? `${a.mediciones[0].temperatura}°C` : ''}
                        {a.mediciones[0].amperaje != null ? ` · ${a.mediciones[0].amperaje}A` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setActivoTarea(a.id)}
                    title="Crear tarea de mantenimiento"
                    className="flex items-center gap-1 text-xs font-bold border-2 border-slate-300 px-2 py-1.5 hover:border-orange-500 hover:text-orange-600 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Plus size={12} /> Tarea
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'chat' && (
            <ChatRemoto
              mensajes={mensajes}
              miRol="superadmin"
              onEnviar={async (c) => {
                const m = await enviarMensajeAdmin(empresaId, c);
                setMensajes((prev) => [...prev, m]);
              }}
            />
          )}
        </div>

        {/* Modal crear tarea */}
        {activoTarea && (
          <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#1e293b] w-full max-w-sm">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
                <h3 className="font-black uppercase text-sm">Nueva tarea de mantenimiento</h3>
                <button onClick={() => setActivoTarea(null)}><X size={18} /></button>
              </div>
              <form onSubmit={handleCrearTarea} className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Tipo de tarea</label>
                  <input
                    required
                    value={formTarea.tipo}
                    onChange={(e) => setFormTarea((p) => ({ ...p, tipo: e.target.value }))}
                    placeholder="Ej: Lubricación, Revisión eléctrica..."
                    className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Fecha programada</label>
                  <input
                    type="date"
                    required
                    value={formTarea.fechaProgramada}
                    onChange={(e) => setFormTarea((p) => ({ ...p, fechaProgramada: e.target.value }))}
                    className="w-full border-2 border-slate-300 px-3 h-10 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Observaciones</label>
                  <textarea
                    value={formTarea.observaciones}
                    onChange={(e) => setFormTarea((p) => ({ ...p, observaciones: e.target.value }))}
                    rows={2}
                    className="w-full border-2 border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={() => setActivoTarea(null)} className="px-4 py-2 border-2 border-slate-400 font-bold text-sm text-slate-600">Cancelar</button>
                  <button type="submit" disabled={guardandoTarea} className="px-4 py-2 bg-orange-500 text-white border-2 border-slate-900 font-bold text-sm disabled:opacity-50">
                    {guardandoTarea ? 'Guardando...' : 'Crear tarea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
