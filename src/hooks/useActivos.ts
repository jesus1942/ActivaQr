import { useStorage } from './useStorage';
import { Activo, Medicion, TareaMantenimiento } from '../data/types';
import { seedActivos, seedMediciones, seedTareas } from '../data/seed';

export function useActivos() {
  const [activos, setActivos] = useStorage<Activo[]>('activos', seedActivos);
  const [mediciones, setMediciones] = useStorage<Medicion[]>('mediciones', seedMediciones);
  const [tareas, setTareas] = useStorage<TareaMantenimiento[]>('tareas', seedTareas);

  const addActivo = (activo: Activo) => {
    setActivos((prev) => [...prev, activo]);
  };

  const updateActivo = (id: string, updates: Partial<Activo>) => {
    setActivos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteActivo = (id: string) => {
    setActivos((prev) => prev.filter((a) => a.id !== id));
  };

  const addMedicion = (medicion: Medicion) => {
    setMediciones((prev) => [...prev, medicion]);
    // Update activo estado based on medicion estado
    if (medicion.estado === 'urgente') {
      updateActivo(medicion.activoId, { estado: 'critico' });
    } else if (medicion.estado === 'revision') {
      const activo = activos.find((a) => a.id === medicion.activoId);
      if (activo && activo.estado === 'normal') {
        updateActivo(medicion.activoId, { estado: 'alerta' });
      }
    }
  };

  const addTarea = (tarea: TareaMantenimiento) => {
    setTareas((prev) => [...prev, tarea]);
  };

  const completarTarea = (id: string, fechaRealizada: string, observaciones?: string) => {
    setTareas((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, estado: 'completado', fechaRealizada, observaciones: observaciones || t.observaciones }
          : t
      )
    );
  };

  const resetData = () => {
    setActivos(seedActivos);
    setMediciones(seedMediciones);
    setTareas(seedTareas);
  };

  return {
    activos,
    mediciones,
    tareas,
    addActivo,
    updateActivo,
    deleteActivo,
    addMedicion,
    addTarea,
    completarTarea,
    resetData,
  };
}
