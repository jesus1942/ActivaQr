// v1.1.0
import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, CheckCircle, X, AlertTriangle, Clock, Pencil, Trash2, Download } from 'lucide-react';
import { exportarCsv } from '../utils/exportCsv';
import { useActivos } from '../hooks/useActivos';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button, Card, EmptyState, Input, Select, Textarea } from '../components/ui';
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

  // Activos críticos o en alerta sin ninguna tarea pendiente/vencida
  const activosSinTarea = activos.filter((a) =>
    (a.estado === 'critico' || a.estado === 'alerta') &&
    !tareas.some((t) => t.activoId === a.id && (t.estado === 'pendiente' || t.estado === 'vencido'))
  );

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
      <Card padding="sm" className={`${highlight ? 'border-danger' : ''} mb-3`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono font-semibold text-sm text-content">{activo?.codigo || 'N/A'}</span>
              <span className="text-faint text-xs">/</span>
              <span className="text-sm font-semibold text-muted break-words">{activo?.nombre}</span>
            </div>
            <div className="font-bold text-content">{tarea.tipo}</div>
            <div className="text-xs text-faint mt-1">{activo ? getSectorNombre(activo.sectorId) : ''}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge
              estado={tarea.estado === 'completado' ? 'normal' : tarea.estado === 'vencido' ? 'critico' : 'alerta'}
              size="sm"
            />
            <div className="flex gap-1">
              <button onClick={() => openEdit(tarea)} title="Editar" className="press grid place-items-center w-8 h-8 rounded-md border border-line text-muted hover:text-content hover:border-line-strong transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDeleteTarea(tarea)} title="Eliminar" className="press grid place-items-center w-8 h-8 rounded-md border border-line text-danger hover:border-danger hover:bg-danger/10 transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-muted">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Programado: {format(parseISO(tarea.fechaProgramada), 'dd/MM/yyyy', { locale: es })}</span>
          </div>
          <span>{getTecnicoNombre(tarea.responsableId)}</span>
        </div>
        {tarea.observaciones && (
          <div className="mt-2 text-xs text-muted bg-subtle p-2 border border-line rounded-md">{tarea.observaciones}</div>
        )}
        {tarea.fechaRealizada && (
          <div className="mt-1 text-xs text-ok-strong dark:text-ok font-semibold">
            Realizado: {format(parseISO(tarea.fechaRealizada), 'dd/MM/yyyy', { locale: es })}
          </div>
        )}
        {tarea.estado !== 'completado' && (
          <div className="mt-3">
            {completingId === tarea.id ? (
              <div className="space-y-2">
                <Textarea
                  value={obsInput}
                  onChange={(e) => setObsInput(e.target.value)}
                  placeholder="Observaciones de cierre..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleCompletar(tarea.id)}
                    variant="primary"
                    size="sm"
                    className="flex-1 bg-ok hover:brightness-95"
                  >
                    Confirmar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCompletingId(null)}
                    variant="secondary"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => setCompletingId(tarea.id)}
                size="sm"
                className="bg-ok hover:brightness-95"
                iconLeft={<CheckCircle size={13} />}
              >
                Marcar Completada
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-content tracking-tight">Mantenimiento</h1>
          <p className="text-muted text-sm mt-1">{vencidas.length} vencidas / {pendientes.length} pendientes</p>
        </div>
        <div className="flex gap-2">
          <Button
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
            variant="secondary"
            iconLeft={<Download size={15} />}
            title="Exportar lista a CSV"
          >
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            onClick={() => openNew()}
            iconLeft={<Plus size={16} />}
          >
            <span className="hidden sm:inline">Nueva Tarea</span>
            <span className="sm:hidden">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Recomendados — activos críticos/alerta sin tarea pendiente */}
      {activosSinTarea.length > 0 && (
        <Card padding="md" className="border-warn/60">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-warn-strong dark:text-warn" />
            <h2 className="font-display font-bold text-content">
              Recomendados ({activosSinTarea.length})
            </h2>
            <span className="text-xs text-muted font-semibold">activos con alerta sin tarea asignada</span>
          </div>
          <div className="space-y-2">
            {activosSinTarea.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between gap-3 p-3 border rounded-md bg-surface ${a.estado === 'critico' ? 'border-danger/50' : 'border-warn/50'}`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-semibold text-sm text-content">{a.codigo}</span>
                  <span className="text-faint text-xs mx-2">/</span>
                  <span className="text-sm font-semibold text-muted">{a.nombre}</span>
                  <div className="text-xs text-faint mt-0.5">{getSectorNombre(a.sectorId)}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge estado={a.estado as any} size="sm" />
                  <Button
                    type="button"
                    onClick={() => crearTareaRecomendada(a.id, a.estado)}
                    size="sm"
                    iconLeft={<Plus size={13} />}
                  >
                    Crear tarea
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencidas */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-danger" />
            <h2 className="font-display font-bold text-danger">Vencidas ({vencidas.length})</h2>
          </div>
          {vencidas.length === 0 ? (
            <EmptyState title="Sin tareas vencidas" />
          ) : (
            vencidas.map((t) => <TaskCard key={t.id} tarea={t} highlight />)
          )}
        </div>

        {/* Pendientes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-warn" />
            <h2 className="font-display font-bold text-warn-strong dark:text-warn">Próximas ({pendientes.length})</h2>
          </div>
          {pendientes.length === 0 ? (
            <EmptyState title="Sin tareas pendientes" />
          ) : (
            pendientes.map((t) => <TaskCard key={t.id} tarea={t} />)
          )}
        </div>
      </div>

      {/* Completadas */}
      <div>
        <h2 className="font-display font-bold text-ok-strong dark:text-ok mb-4 flex items-center gap-2">
          <CheckCircle size={18} />
          Completadas ({completadas.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {completadas.map((t) => <TaskCard key={t.id} tarea={t} />)}
        </div>
      </div>

      {/* Modal nueva tarea */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-line shadow-lift w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface">
              <h2 className="font-display text-lg font-bold text-content">{editId ? 'Editar tarea' : 'Nueva tarea de mantenimiento'}</h2>
              <button
                onClick={() => { setShowModal(false); setEditId(null); }}
                className="press grid place-items-center w-9 h-9 rounded-md text-faint hover:text-content hover:bg-subtle transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddTarea} className="p-4 space-y-3">
              <Select
                required
                label="Activo"
                value={newTarea.activoId}
                onChange={(e) => setNewTarea((p) => ({ ...p, activoId: e.target.value }))}
              >
                <option value="">Seleccionar activo...</option>
                {activos.map((a) => (
                  <option key={a.id} value={a.id}>{a.codigo} — {a.nombre}</option>
                ))}
              </Select>
              <Input
                label="Tipo de tarea"
                type="text"
                required
                value={newTarea.tipo}
                onChange={(e) => setNewTarea((p) => ({ ...p, tipo: e.target.value }))}
                placeholder="Ej: Cambio de aceite, revisión general..."
              />
              <Input
                label="Fecha programada"
                type="date"
                required
                value={newTarea.fechaProgramada}
                onChange={(e) => setNewTarea((p) => ({ ...p, fechaProgramada: e.target.value }))}
              />
              <Select
                required
                label="Responsable"
                value={newTarea.responsableId}
                onChange={(e) => setNewTarea((p) => ({ ...p, responsableId: e.target.value }))}
              >
                <option value="">Seleccionar técnico...</option>
                {tecnicosActivos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </Select>
              <Textarea
                label="Observaciones"
                value={newTarea.observaciones}
                onChange={(e) => setNewTarea((p) => ({ ...p, observaciones: e.target.value }))}
                rows={2}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditId(null); }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editId ? 'Guardar Cambios' : 'Crear Tarea'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
