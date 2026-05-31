import { useStorage } from './useStorage';
import {
  Activo,
  Medicion,
  TareaMantenimiento,
  Sector,
  TipoActivo,
  Tecnico,
} from '../data/types';
import {
  seedActivos,
  seedMediciones,
  seedTareas,
  seedSectores,
  seedTipos,
  seedTecnicos,
} from '../data/seed';
import { useRemote } from '../data/store';

export function useActivos() {
  // En modo remoto arrancamos con arrays vacíos para no mostrar datos de prueba
  // mientras llega la primera respuesta de la API.
  const defaultActivos    = useRemote ? [] : seedActivos;
  const defaultMediciones = useRemote ? [] : seedMediciones;
  const defaultTareas     = useRemote ? [] : seedTareas;
  const defaultSectores   = useRemote ? [] : seedSectores;
  const defaultTipos      = useRemote ? [] : seedTipos;
  const defaultTecnicos   = useRemote ? [] : seedTecnicos;

  const [activos, setActivos] = useStorage<Activo[]>('activos', defaultActivos as Activo[]);
  const [mediciones, setMediciones] = useStorage<Medicion[]>('mediciones', defaultMediciones as Medicion[]);
  const [tareas, setTareas] = useStorage<TareaMantenimiento[]>('tareas', defaultTareas as TareaMantenimiento[]);
  const [sectores, setSectores] = useStorage<Sector[]>('sectores', defaultSectores as Sector[]);
  const [tipos, setTipos] = useStorage<TipoActivo[]>('tipos', defaultTipos as TipoActivo[]);
  const [tecnicos, setTecnicos] = useStorage<Tecnico[]>('tecnicos', defaultTecnicos as Tecnico[]);

  // ── Activos ────────────────────────────────────────────────
  const addActivo = (activo: Activo) => {
    setActivos((prev) => [...prev, activo]);
  };

  const updateActivo = (id: string, updates: Partial<Activo>) => {
    setActivos((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteActivo = (id: string) => {
    setActivos((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Mediciones ─────────────────────────────────────────────
  const addMedicion = (medicion: Medicion) => {
    setMediciones((prev) => [...prev, medicion]);
    if (medicion.estado === 'urgente') {
      updateActivo(medicion.activoId, { estado: 'critico' });
    } else if (medicion.estado === 'revision') {
      const activo = activos.find((a) => a.id === medicion.activoId);
      if (activo && activo.estado === 'normal') {
        updateActivo(medicion.activoId, { estado: 'alerta' });
      }
    }
  };

  const deleteMedicion = (id: string) => {
    setMediciones((prev) => prev.filter((m) => m.id !== id));
  };

  // ── Tareas ─────────────────────────────────────────────────
  const addTarea = (tarea: TareaMantenimiento) => {
    setTareas((prev) => [...prev, tarea]);
  };

  const updateTarea = (id: string, updates: Partial<TareaMantenimiento>) => {
    setTareas((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTarea = (id: string) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
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

  // ── Sectores ───────────────────────────────────────────────
  const addSector = (sector: Sector) => {
    setSectores((prev) => [...prev, sector]);
  };

  const updateSector = (id: string, updates: Partial<Sector>) => {
    setSectores((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSector = (id: string) => {
    const enUso = activos.some((a) => a.sectorId === id);
    if (enUso) {
      setSectores((prev) => prev.map((s) => (s.id === id ? { ...s, activo: false } : s)));
    } else {
      setSectores((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // ── Tipos ──────────────────────────────────────────────────
  const addTipo = (tipo: TipoActivo) => {
    setTipos((prev) => [...prev, tipo]);
  };

  const updateTipo = (id: string, updates: Partial<TipoActivo>) => {
    setTipos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTipo = (id: string) => {
    const enUso = activos.some((a) => a.tipoId === id);
    if (enUso) {
      setTipos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: false } : t)));
    } else {
      setTipos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ── Técnicos ───────────────────────────────────────────────
  const addTecnico = (tecnico: Tecnico) => {
    setTecnicos((prev) => [...prev, tecnico]);
  };

  const updateTecnico = (id: string, updates: Partial<Tecnico>) => {
    setTecnicos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTecnico = (id: string) => {
    const enUso =
      activos.some((a) => a.responsableId === id) ||
      mediciones.some((m) => m.tecnicoId === id) ||
      tareas.some((t) => t.responsableId === id);
    if (enUso) {
      setTecnicos((prev) => prev.map((t) => (t.id === id ? { ...t, activo: false } : t)));
    } else {
      setTecnicos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // ── Helpers ────────────────────────────────────────────────
  const getSectorNombre = (id: string) => sectores.find((s) => s.id === id)?.nombre ?? '—';
  const getTipoNombre = (id: string) => tipos.find((t) => t.id === id)?.nombre ?? '—';
  const getTecnicoNombre = (id: string) => tecnicos.find((t) => t.id === id)?.nombre ?? '—';
  const getTipo = (id: string): TipoActivo | undefined => tipos.find((t) => t.id === id);

  const resetData = () => {
    setActivos(seedActivos);
    setMediciones(seedMediciones);
    setTareas(seedTareas);
    setSectores(seedSectores);
    setTipos(seedTipos);
    setTecnicos(seedTecnicos);
  };

  return {
    activos,
    mediciones,
    tareas,
    sectores,
    tipos,
    tecnicos,
    addActivo,
    updateActivo,
    deleteActivo,
    addMedicion,
    deleteMedicion,
    addTarea,
    updateTarea,
    deleteTarea,
    completarTarea,
    addSector,
    updateSector,
    deleteSector,
    addTipo,
    updateTipo,
    deleteTipo,
    addTecnico,
    updateTecnico,
    deleteTecnico,
    getSectorNombre,
    getTipoNombre,
    getTecnicoNombre,
    getTipo,
    resetData,
  };
}
