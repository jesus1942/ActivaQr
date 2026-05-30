import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, CheckCircle, X, AlertTriangle, Clock } from 'lucide-react';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TareaMantenimiento } from '../data/types';

export const Mantenimiento: React.FC = () => {
  const { activos, tareas, completarTarea, addTarea } = useActivos();
  const [showModal, setShowModal] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [obsInput, setObsInput] = useState('');
  const [newTarea, setNewTarea] = useState({
    activoId: '',
    tipo: '',
    fechaProgramada: format(new Date(), 'yyyy-MM-dd'),
    responsable: '',
    observaciones: '',
  });

  const vencidas = tareas.filter((t) => t.estado === 'vencido');
  const pendientes = tareas.filter((t) => t.estado === 'pendiente');
  const completadas = tareas.filter((t) => t.estado === 'completado');

  const handleCompletar = (id: string) => {
    completarTarea(id, format(new Date(), 'yyyy-MM-dd'), obsInput);
    setCompletingId(null);
    setObsInput('');
  };

  const handleAddTarea = (e: React.FormEvent) => {
    e.preventDefault();
    addTarea({
      id: `tar-${Date.now()}`,
      ...newTarea,
      estado: 'pendiente',
    } as TareaMantenimiento);
    setShowModal(false);
    setNewTarea({ activoId: '', tipo: '', fechaProgramada: format(new Date(), 'yyyy-MM-dd'), responsable: '', observaciones: '' });
  };

  const TaskCard = ({ tarea, highlight }: { tarea: TareaMantenimiento; highlight?: boolean }) => {
    const activo = activos.find((a) => a.id === tarea.activoId);
    return (
      <div className={`bg-white border-2 ${highlight ? 'border-red-500' : 'border-slate-800'} shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 mb-3`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-black text-sm text-slate-800">{activo?.codigo || 'N/A'}</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-sm font-semibold text-slate-700">{activo?.nombre}</span>
            </div>
            <div className="font-bold text-slate-900">{tarea.tipo}</div>
            <div className="text-xs text-slate-500 mt-1">{activo?.sector}</div>
          </div>
          <StatusBadge
            estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
            size="sm"
          />
        </div>
        <div className="mt-2 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Programado: {format(parseISO(tarea.fechaProgramada), 'dd/MM/yyyy', { locale: es })}</span>
          </div>
          <span>{tarea.responsable}</span>
        </div>
        {tarea.observaciones && (
          <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 border border-slate-200">{tarea.observaciones}</div>
        )}
        {tarea.fechaRealizada && (
          <div className="mt-1 text-xs text-emerald-600 font-semibold">
            Realizado: {format(parseISO(tarea.fechaRealizada), 'dd/MM/yyyy', { locale: es })}
          </div>
        )}
        {tarea.estado !== 'completado' && (
          <div className="mt-3">
            {completingId === tarea.id ? (
              <div className="space-y-2">
                <textarea
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  placeholder="Observaciones de cierre..."
                  rows={2}
                  className="w-full border-2 border-slate-300 px-2 py-1 text-xs outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompletar(tarea.id)}
                    className="flex-1 bg-emerald-500 text-white py-1.5 text-xs font-bold border-2 border-emerald-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setCompletingId(null)}
                    className="px-3 py-1.5 border-2 border-slate-300 text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCompletingId(tarea.id)}
                className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 text-xs font-bold border-2 border-emerald-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
              >
                <CheckCircle size={13} />
                Marcar Completada
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Mantenimiento</h1>
          <p className="text-slate-500 text-sm mt-1">{vencidas.length} vencidas · {pendientes.length} pendientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all"
        >
          <Plus size={16} />
          Nueva Tarea
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencidas */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-600" />
            <h2 className="font-black text-red-600 uppercase tracking-wide">VENCIDAS ({vencidas.length})</h2>
          </div>
          {vencidas.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200">
              <p className="font-semibold">Sin tareas vencidas</p>
            </div>
          ) : (
            vencidas.map((t) => <TaskCard key={t.id} tarea={t} highlight />)
          )}
        </div>

        {/* Pendientes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-orange-500" />
            <h2 className="font-black text-orange-500 uppercase tracking-wide">PRÓXIMAS ({pendientes.length})</h2>
          </div>
          {pendientes.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200">
              <p className="font-semibold">Sin tareas pendientes</p>
            </div>
          ) : (
            pendientes.map((t) => <TaskCard key={t.id} tarea={t} />)
          )}
        </div>
      </div>

      {/* Completadas */}
      <div className="mt-8">
        <h2 className="font-black text-emerald-600 uppercase tracking-wide mb-4 flex items-center gap-2">
          <CheckCircle size={18} />
          COMPLETADAS ({completadas.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {completadas.map((t) => <TaskCard key={t.id} tarea={t} />)}
        </div>
      </div>

      {/* Modal nueva tarea */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900 text-white">
              <h2 className="font-black uppercase tracking-wide">Nueva Tarea de Mantenimiento</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTarea} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Activo</label>
                <select
                  required
                  value={newTarea.activoId}
                  onChange={(e) => setNewTarea((p) => ({ ...p, activoId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                >
                  <option value="">Seleccionar activo...</option>
                  {activos.map((a) => (
                    <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Tipo de Tarea</label>
                <input
                  type="text"
                  required
                  value={newTarea.tipo}
                  onChange={(e) => setNewTarea((p) => ({ ...p, tipo: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                  placeholder="Ej: Cambio de aceite, Revisión general..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Fecha Programada</label>
                <input
                  type="date"
                  required
                  value={newTarea.fechaProgramada}
                  onChange={(e) => setNewTarea((p) => ({ ...p, fechaProgramada: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Responsable</label>
                <input
                  type="text"
                  required
                  value={newTarea.responsable}
                  onChange={(e) => setNewTarea((p) => ({ ...p, responsable: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                  placeholder="Nombre del técnico responsable"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Observaciones</label>
                <textarea
                  value={newTarea.observaciones}
                  onChange={(e) => setNewTarea((p) => ({ ...p, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border-2 border-slate-300 px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border-2 border-slate-400 font-bold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
