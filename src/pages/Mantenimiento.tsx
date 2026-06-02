// v1.1.0
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, CheckCircle, X, AlertTriangle, Clock, Pencil, Trash2, Download } from 'lucide-react';
import { exportarCsv } from '../utils/exportCsv';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TareaMantenimiento } from '../data/types';

const emptyTarea = {
  activoId: '',
  tipo: '',
  fechaProgramada: format(new Date(), 'yyyy-MM-dd'),
  responsableId: '',
  observaciones: '',
};

export const Mantenimiento: React.FC = () => {
  const {
    activos, tareas, tecnicos, completarTarea, addTarea, updateTarea, deleteTarea,
    getSectorNombre, getTecnicoNombre,
  } = useActivos();
  const tecnicosActivos = tecnicos.filter((t) => t.activo);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [obsInput, setObsInput] = useState('');
  const [newTarea, setNewTarea] = useState(emptyTarea);

  const vencidas = tareas.filter((t) => t.estado === 'vencido');
  const pendientes = tareas.filter((t) => t.estado === 'pendiente');
  const completadas = tareas.filter((t) => t.estado === 'completado');

  const handleCompletar = (id: string) => {
    completarTarea(id, format(new Date(), 'yyyy-MM-dd'), obsInput);
    setCompletingId(null);
    setObsInput('');
  };

  const openNew = () => { setEditId(null); setNewTarea(emptyTarea); setShowModal(true); };

  const openEdit = (t: TareaMantenimiento) => {
    setEditId(t.id);
    setNewTarea({
      activoId: t.activoId,
      tipo: t.tipo,
      fechaProgramada: t.fechaProgramada,
      responsableId: t.responsableId,
      observaciones: t.observaciones,
    });
    setShowModal(true);
  };

  const handleAddTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateTarea(editId, newTarea);
    } else {
      addTarea({
        id: `tar-${Date.now()}`,
        ...newTarea,
        estado: 'pendiente',
      } as TareaMantenimiento);
    }
    setShowModal(false);
    setEditId(null);
    setNewTarea(emptyTarea);
  };

  const handleDeleteTarea = (t: TareaMantenimiento) => {
    if (window.confirm(`¿Eliminar la tarea "${t.tipo}"?`)) deleteTarea(t.id);
  };

  const TaskCard = ({ tarea, highlight }: { tarea: TareaMantenimiento; highlight?: boolean }) => {
    const activo = activos.find((a) => a.id === tarea.activoId);
    return (
      <div className={`bg-white border-2 ${highlight ? 'border-red-500' : 'border-slate-800'} shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] p-4 mb-3`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-black text-sm text-slate-800">{activo?.codigo || 'N/A'}</span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-sm font-semibold text-slate-700 break-words">{activo?.nombre}</span>
            </div>
            <div className="font-bold text-slate-900">{tarea.tipo}</div>
            <div className="text-xs text-slate-500 mt-1">{activo ? getSectorNombre(activo.sectorId) : ''}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge
              estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
              size="sm"
            />
            <div className="flex gap-1">
              <button onClick={() => openEdit(tarea)} title="Editar" className="p-1.5 border-2 border-slate-300 text-slate-600 hover:border-slate-800">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDeleteTarea(tarea)} title="Eliminar" className="p-1.5 border-2 border-slate-300 text-red-600 hover:border-red-600 hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Programado: {format(parseISO(tarea.fechaProgramada), 'dd/MM/yyyy', { locale: es })}</span>
          </div>
          <span>{getTecnicoNombre(tarea.responsableId)}</span>
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
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight">Mantenimiento</h1>
          <p className="text-slate-500 text-sm mt-1">{vencidas.length} vencidas · {pendientes.length} pendientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCsv('tareas', tareas.map((t) => {
              const activo = activos.find((a) => a.id === t.activoId);
              return {
                Activo: activo?.codigo ?? '', Nombre: activo?.nombre ?? '',
                Tipo: t.tipo, Estado: t.estado,
                'Fecha Programada': t.fechaProgramada,
                'Fecha Realizada': t.fechaRealizada ? format(parseISO(t.fechaRealizada), 'dd/MM/yyyy', { locale: es }) : '',
                Responsable: getTecnicoNombre(t.responsableId),
                Observaciones: t.observaciones,
              };
            }))}
            className="flex items-center gap-2 bg-white text-slate-700 px-3 min-h-[44px] font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all text-sm"
            title="Exportar lista a CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 min-h-[44px] font-bold border-2 border-slate-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Tarea</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
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
          <div className="bg-white border-2 border-slate-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.8)] w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b-2 border-slate-800 bg-slate-900 text-white sticky top-0">
              <h2 className="font-black uppercase tracking-wide">{editId ? 'Editar Tarea' : 'Nueva Tarea de Mantenimiento'}</h2>
              <button onClick={() => { setShowModal(false); setEditId(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTarea} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Activo</label>
                <select
                  required
                  value={newTarea.activoId}
                  onChange={(e) => setNewTarea((p) => ({ ...p, activoId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none"
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
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none"
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
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">Responsable</label>
                <select
                  required
                  value={newTarea.responsableId}
                  onChange={(e) => setNewTarea((p) => ({ ...p, responsableId: e.target.value }))}
                  className="w-full border-2 border-slate-300 px-3 h-11 text-sm outline-none"
                >
                  <option value="">Seleccionar técnico...</option>
                  {tecnicosActivos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
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
                <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 min-h-[44px] border-2 border-slate-400 font-bold text-slate-600">
                  Cancelar
                </button>
                <button type="submit" className="px-4 min-h-[44px] bg-orange-500 text-white border-2 border-slate-800 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,0.8)]">
                  {editId ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
