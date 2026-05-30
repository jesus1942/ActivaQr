/**
 * Capa de abstracción de datos.
 *
 * Hoy persiste en localStorage. Está preparada para conectarse a la API
 * (Railway) cuando exista la variable de entorno VITE_API_URL.
 *
 * Cuando VITE_API_URL esté definida, las funciones async harían fetch contra
 * `${API_URL}/api/<entidad>`. Por ahora solo está implementado el modo
 * localStorage; el branch remoto queda comentado/preparado.
 */
import {
  Activo,
  Medicion,
  TareaMantenimiento,
  Sector,
  TipoActivo,
  Tecnico,
} from './types';
import {
  seedActivos,
  seedMediciones,
  seedTareas,
  seedSectores,
  seedTipos,
  seedTecnicos,
} from './seed';

export const API_URL: string | undefined = import.meta.env.VITE_API_URL;
export const useRemote = Boolean(API_URL);

const KEYS = {
  activos: 'activos',
  mediciones: 'mediciones',
  tareas: 'tareas',
  sectores: 'sectores',
  tipos: 'tipos',
  tecnicos: 'tecnicos',
} as const;

function read<T>(key: string, seed: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item == null) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(item) as T;
  } catch {
    return seed;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Inicializa localStorage con los seeds si las claves no existen aún.
 * Idempotente: solo escribe lo que falta.
 */
export function ensureSeed(): void {
  read(KEYS.activos, seedActivos);
  read(KEYS.mediciones, seedMediciones);
  read(KEYS.tareas, seedTareas);
  read(KEYS.sectores, seedSectores);
  read(KEYS.tipos, seedTipos);
  read(KEYS.tecnicos, seedTecnicos);
}

// ─────────────────────────────────────────────────────────────
// API async (modo localStorage). Lista para reemplazar por fetch remoto.
// ─────────────────────────────────────────────────────────────

export async function getActivos(): Promise<Activo[]> {
  // if (useRemote) return fetch(`${API_URL}/api/activos`).then((r) => r.json());
  return read(KEYS.activos, seedActivos);
}

export async function getMediciones(): Promise<Medicion[]> {
  // if (useRemote) return fetch(`${API_URL}/api/mediciones`).then((r) => r.json());
  return read(KEYS.mediciones, seedMediciones);
}

export async function getTareas(): Promise<TareaMantenimiento[]> {
  // if (useRemote) return fetch(`${API_URL}/api/tareas`).then((r) => r.json());
  return read(KEYS.tareas, seedTareas);
}

export async function getSectores(): Promise<Sector[]> {
  // if (useRemote) return fetch(`${API_URL}/api/sectores`).then((r) => r.json());
  return read(KEYS.sectores, seedSectores);
}

export async function getTipos(): Promise<TipoActivo[]> {
  // if (useRemote) return fetch(`${API_URL}/api/tipos`).then((r) => r.json());
  return read(KEYS.tipos, seedTipos);
}

export async function getTecnicos(): Promise<Tecnico[]> {
  // if (useRemote) return fetch(`${API_URL}/api/tecnicos`).then((r) => r.json());
  return read(KEYS.tecnicos, seedTecnicos);
}

export async function saveActivos(data: Activo[]): Promise<void> {
  // if (useRemote) { await fetch(`${API_URL}/api/activos`, { method: 'PUT', ... }); return; }
  write(KEYS.activos, data);
}

export async function saveMediciones(data: Medicion[]): Promise<void> {
  write(KEYS.mediciones, data);
}

export async function saveTareas(data: TareaMantenimiento[]): Promise<void> {
  write(KEYS.tareas, data);
}

export async function saveSectores(data: Sector[]): Promise<void> {
  write(KEYS.sectores, data);
}

export async function saveTipos(data: TipoActivo[]): Promise<void> {
  write(KEYS.tipos, data);
}

export async function saveTecnicos(data: Tecnico[]): Promise<void> {
  write(KEYS.tecnicos, data);
}

export const STORAGE_KEYS = KEYS;
