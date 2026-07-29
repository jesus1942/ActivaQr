// v1.1.0
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, CheckCircle, X, AlertTriangle, Clock, Pencil, Trash2, Download } from 'lucide-react';

function fmtFecha(fecha: string | null | undefined, fmtStr = 'dd/MM/yyyy'): string {
  if (!fecha) return '—';
  try {
    const d = parseISO(String(fecha));
    if (isNaN(d.getTime())) return '—';
    return format(d, fmtStr, { locale: es });
  } catch {
    return '—';
  }
}
import { exportarCsv } from '../utils/exportCsv';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TareaMantenimiento } from '../data/types';
import { DialogViewport } from '../components/ui/DialogViewport';

const emptyTarea = {
  activoId: '',
  tipo: '',
  prioridad: 'media' as 'baja' | 'media' | 'alta',
  fechaProgramada: format(new Date(), 'yyyy-MM-dd'),
  responsableId: '',
  observaciones: '',
  materiales: '',
  horasTrabajo: null as number | null,
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

  const crearTareaRecomendada = (activoId: string, estadoActivo: string) => {
    const tipo = estadoActivo === 'critico' ? 'Revision urgente — estado critico' : 'Revision — estado en alerta';
    addTarea({
      id: `tar-${Date.now()}`,
      activoId,
      tipo,
      fechaProgramada: format(new Date(), 'yyyy-MM-dd'),
      responsableId: '',
      observaciones: `Generada automaticamente el ${format(new Date(), 'dd/MM/yyyy')}`,
      estado: 'pendiente',
    } as TareaMantenimiento);
  };

  const handleCompletar = (id: string) => {
    completarTarea(id, format(new Date(), 'yyyy-MM-dd'), obsInput);
    setCompletingId(null);
    setObsInput('');
  };

  const openNew = (preActivoId?: string) => {
    setEditId(null);
    setNewTarea({ ...emptyTarea, activoId: preActivoId ?? '' });
    setShowModal(true);
  };

  const activosSinTarea = activos.filter((a) =>
    (a.estado === 'critico' || a.estado === 'alerta') &&
    !tareas.some((t) => t.activoId === a.id && (t.estado === 'pendiente' || t.estado === 'vencido'))
  );

  const openEdit = (t: TareaMantenimiento) => {
    setEditId(t.id);
    setNewTarea({
      activoId: t.activoId,
      tipo: t.tipo,
      prioridad: t.prioridad ?? 'media',
      fechaProgramada: t.fechaProgramada,
      responsableId: t.responsableId,
      observaciones: t.observaciones,
      materiales: t.materiales ?? '',
      horasTrabajo: t.horasTrabajo ?? null,
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
      <div className={`bg-surface border ${highlight ? 'border-danger' : 'border-line'} shadow-soft p-4 mb-3`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {tarea.numero != null && (
                <span className="font-mono font-black text-xs bg-slate-900 text-white px-1.5 py-0.5">OT-{String(tarea.numero).padStart(5, '0')}</span>
              )}
              <span className="font-mono font-black text-sm text-content">{activo?.codigo || 'N/A'}</span>
              <span className="text-muted text-xs">·</span>
              <span className="text-sm font-semibold text-content break-words">{activo?.nombre}</span>
              {tarea.prioridad && tarea.prioridad !== 'media' && (
                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 border ${tarea.prioridad === 'alta' ? 'bg-danger/10 text-danger-strong dark:text-danger border-danger' : 'bg-subtle text-muted border-line'}`}>
                  {tarea.prioridad}
                </span>
              )}
            </div>
            <div className="font-bold text-content">{tarea.tipo}</div>
            <div className="text-xs text-muted mt-1">{activo ? getSectorNombre(activo.sectorId) : ''}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge
              estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
              size="sm"
            />
            <div className="flex gap-1">
              <button onClick={() => openEdit(tarea)} title="Editar" className="p-1.5 border border-line text-muted hover:border-content">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDeleteTarea(tarea)} title="Eliminar" className="p-1.5 border border-line text-danger hover:border-danger hover:bg-danger/10">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Programado: {fmtFecha(tarea.fechaProgramada)}</span>
          </div>
          <span>{getTecnicoNombre(tarea.responsableId)}</span>
        </div>
        {tarea.observaciones && (
          <div className="mt-2 text-xs text-muted bg-subtle p-2 border border-line">{tarea.observaciones}</div>
        )}
        {(tarea.materiales || tarea.horasTrabajo != null) && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {tarea.materiales && <span><strong className="text-content">Materiales:</strong> {tarea.materiales}</span>}
            {tarea.horasTrabajo != null && <span><strong className="text-content">Horas:</strong> {tarea.horasTrabajo}</span>}
          </div>
        )}
        {tarea.fechaRealizada && (
          <div className="mt-1 text-xs text-ok-strong dark:text-ok font-semibold">
            Realizado: {fmtFecha(tarea.fechaRealizada)}
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
                  className="w-full border border-line px-2 py-1 text-xs outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCompletar(tarea.id)}
                    className="flex-1 bg-ok text-white py-1.5 text-xs font-bold border border-emerald-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setCompletingId(null)}
                    className="px-3 py-1.5 border border-line text-xs font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCompletingId(tarea.id)}
                className="flex items-center gap-1.5 bg-ok text-white px-3 py-1.5 text-xs font-bold border border-emerald-700 shadow-soft"
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
          <h1 className="text-2xl sm:text-3xl font-bold text-content tracking-tight">Mantenimiento</h1>
          <p className="text-muted text-sm mt-1">{vencidas.length} vencidas · {pendientes.length} pendientes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCsv('tareas', tareas.map((t) => {
              const activo = activos.find((a) => a.id === t.activoId);
              return {
                Activo: activo?.codigo ?? '', Nombre: activo?.nombre ?? '',
                Tipo: t.tipo, Estado: t.estado,
                'Fecha Programada': t.fechaProgramada,
                'Fecha Realizada': t.fechaRealizada ? fmtFecha(t.fechaRealizada) : '',
                Responsable: getTecnicoNombre(t.responsableId),
                Observaciones: t.observaciones,
              };
            }))}
            className="flex items-center gap-2 bg-surface text-content px-3 min-h-[44px] font-bold border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-soft transition-all text-sm"
            title="Exportar lista a CSV"
          >
            <Download size={15} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => openNew()}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 min-h-[44px] font-bold border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-soft transition-all"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Tarea</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {activosSinTarea.length > 0 && (
        <div className="mb-8 bg-warn/10 border border-warn shadow-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-warn-strong dark:text-warn" />
            <h2 className="font-black text-warn-strong dark:text-warn uppercase tracking-wide">
              RECOMENDADOS ({activosSinTarea.length})
            </h2>
            <span className="text-xs text-warn-strong dark:text-warn font-semibold hidden sm:inline">— activos con alerta sin tarea asignada</span>
          </div>
          <div className="space-y-2">
            {activosSinTarea.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-3 p-3 border bg-surface ${a.estado === 'critico' ? 'border-danger' : 'border-warn'}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-black text-sm text-content">{a.codigo}</span>
                  <span className="text-muted text-xs mx-2">·</span>
                  <span className="text-sm font-semibold text-content">{a.nombre}</span>
                  <div className="text-xs text-muted mt-0.5">{getSectorNombre(a.sectorId)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge estado={a.estado as any} size="sm" />
                  <button
                    onClick={() => crearTareaRecomendada(a.id, a.estado)}
                    className="flex items-center gap-1.5 bg-brand-600 text-white px-3 py-1.5 text-xs font-black border border-line shadow-soft hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-soft transition-all whitespace-nowrap"
                  >
                    <Plus size={13} />
                    Crear tarea
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencidas */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-danger" />
            <h2 className="font-black text-danger uppercase tracking-wide">VENCIDAS ({vencidas.length})</h2>
          </div>
          {vencidas.length === 0 ? (
            <div className="text-center py-8 text-faint border border-dashed border-line">
              <p className="font-semibold">Sin tareas vencidas</p>
            </div>
          ) : (
            vencidas.map((t) => <TaskCard key={t.id} tarea={t} highlight />)
          )}
        </div>

        {/* Pendientes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-brand-600" />
            <h2 className="font-black text-brand-600 uppercase tracking-wide">PRÓXIMAS ({pendientes.length})</h2>
          </div>
          {pendientes.length === 0 ? (
            <div className="text-center py-8 text-faint border border-dashed border-line">
              <p className="font-semibold">Sin tareas pendientes</p>
            </div>
          ) : (
            pendientes.map((t) => <TaskCard key={t.id} tarea={t} />)
          )}
        </div>
      </div>

      {/* Completadas */}
      <div className="mt-8">
        <h2 className="font-black text-ok-strong dark:text-ok uppercase tracking-wide mb-4 flex items-center gap-2">
          <CheckCircle size={18} />
          COMPLETADAS ({completadas.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {completadas.map((t) => <TaskCard key={t.id} tarea={t} />)}
        </div>
      </div>

      {/* Modal nueva tarea */}
      {showModal && (
        <DialogViewport
          className="bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onEscape={() => { setShowModal(false); setEditId(null); }}
        >
          <div className="bg-surface/85 backdrop-blur-xl border border-line shadow-soft w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border border-line bg-slate-900 text-white sticky top-0">
              <h2 className="font-black uppercase tracking-wide">{editId ? 'Editar Tarea' : 'Nueva Tarea de Mantenimiento'}</h2>
              <button onClick={() => { setShowModal(false); setEditId(null); }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTarea} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Activo</label>
                <select
                  required
                  value={newTarea.activoId}
                  onChange={(e) => setNewTarea((p) => ({ ...p, activoId: e.target.value }))}
                  className="w-full border border-line px-3 h-11 text-sm outline-none"
                >
                  <option value="">Seleccionar activo...</option>
                  {activos.map((a) => (
                    <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Tipo de Tarea</label>
                <input
                  type="text"
                  required
                  value={newTarea.tipo}
                  onChange={(e) => setNewTarea((p) => ({ ...p, tipo: e.target.value }))}
                  className="w-full border border-line px-3 h-11 text-sm outline-none"
                  placeholder="Ej: Cambio de aceite, Revisión general..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Fecha Programada</label>
                <input
                  type="date"
                  required
                  value={newTarea.fechaProgramada}
                  onChange={(e) => setNewTarea((p) => ({ ...p, fechaProgramada: e.target.value }))}
                  className="w-full border border-line px-3 h-11 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Responsable</label>
                <select
                  required
                  value={newTarea.responsableId}
                  onChange={(e) => setNewTarea((p) => ({ ...p, responsableId: e.target.value }))}
                  className="w-full border border-line px-3 h-11 text-sm outline-none"
                >
                  <option value="">Seleccionar técnico...</option>
                  {tecnicosActivos.map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Prioridad</label>
                  <select
                    value={newTarea.prioridad}
                    onChange={(e) => setNewTarea((p) => ({ ...p, prioridad: e.target.value as 'baja' | 'media' | 'alta' }))}
                    className="w-full border border-line px-3 h-11 text-sm outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Horas de trabajo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={newTarea.horasTrabajo ?? ''}
                    onChange={(e) => setNewTarea((p) => ({ ...p, horasTrabajo: e.target.value === '' ? null : Number(e.target.value) }))}
                    className="w-full border border-line px-3 h-11 text-sm outline-none"
                    placeholder="Ej: 2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Materiales utilizados</label>
                <textarea
                  value={newTarea.materiales ?? ''}
                  onChange={(e) => setNewTarea((p) => ({ ...p, materiales: e.target.value }))}
                  rows={2}
                  className="w-full border border-line px-3 py-1.5 text-sm outline-none"
                  placeholder="Ej: 2 filtros, 5L aceite 15W40..."
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-muted mb-1">Observaciones</label>
                <textarea
                  value={newTarea.observaciones}
                  onChange={(e) => setNewTarea((p) => ({ ...p, observaciones: e.target.value }))}
                  rows={2}
                  className="w-full border border-line px-3 py-1.5 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditId(null); }} className="px-4 min-h-[44px] border border-line-strong font-bold text-muted">
                  Cancelar
                </button>
                <button type="submit" className="px-4 min-h-[44px] bg-brand-600 text-white border border-line font-bold shadow-soft">
                  {editId ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </DialogViewport>
      )}
    </div>
  );
};
