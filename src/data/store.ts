// v1.1.0
/**
 * Capa de abstracción de datos.
 *
 * - Si existe VITE_API_URL → usa la API REST (Railway + PostgreSQL).
 * - Si no → persiste en localStorage (modo demo / offline).
 *
 * El frontend siempre trabaja con arrays planos. En modo remoto, las
 * lecturas traen la lista por GET y las escrituras calculan cambios
 * explícitos. El backend nunca interpreta una omisión como un borrado.
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
import { authHeaders } from './auth';

export type { Activo, Medicion, TareaMantenimiento, Sector, TipoActivo, Tecnico } from './types';

import { API_URL } from './apiUrl';
export { API_URL };
export const useRemote = Boolean(API_URL);

const KEYS = {
  activos: 'activos',
  mediciones: 'mediciones',
  tareas: 'tareas',
  sectores: 'sectores',
  tipos: 'tipos',
  tecnicos: 'tecnicos',
} as const;

// ─────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────

// IMPORTANTE: NO atrapar errores aca y devolver []. Si la red falla y este
// helper devuelve [] silenciosamente, el hook cree que la BD esta vacia
// y al primer cambio del usuario el sync borra TODO en backend. Pasa la
// excepcion para que useStorage decida (no marcar cargado=true, mostrar
// banner, bloquear sync).
const snapshots = new Map<string, unknown[]>();
const syncQueues = new Map<string, Promise<void>>();
type BootstrapData = {
  activos: any[];
  mediciones: Medicion[];
  tareas: TareaMantenimiento[];
  sectores: Sector[];
  tipos: TipoActivo[];
  tecnicos: Tecnico[];
};

let bootstrapPromise: Promise<BootstrapData> | null = null;
let bootstrapCache: { data: BootstrapData; venceEn: number } | null = null;

function cloneItems<T>(items: T[]): T[] {
  return typeof structuredClone === 'function'
    ? structuredClone(items)
    : JSON.parse(JSON.stringify(items));
}

/**
 * Las seis colecciones base viajan en una única respuesta. La caché dura sólo
 * dos segundos: alcanza para que los seis hooks compartan la misma llamada,
 * pero un reintento posterior siempre vuelve a consultar el servidor.
 */
async function getBootstrap(): Promise<BootstrapData> {
  if (bootstrapCache && bootstrapCache.venceEn > Date.now()) {
    return bootstrapCache.data;
  }
  if (bootstrapPromise) return bootstrapPromise;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  bootstrapPromise = fetch(`${API_URL}/sync/bootstrap`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`GET sync/bootstrap → ${res.status}`);
    const data = (await res.json()) as BootstrapData;
    for (const key of Object.keys(KEYS) as Array<keyof typeof KEYS>) {
      if (!Array.isArray(data[key])) {
        throw new Error(`Bootstrap incompleto: falta ${key}`);
      }
    }
    bootstrapCache = { data, venceEn: Date.now() + 2_000 };
    return data;
  }).finally(() => {
    window.clearTimeout(timer);
  });

  const actual = bootstrapPromise;
  actual.then(
    () => { if (bootstrapPromise === actual) bootstrapPromise = null; },
    () => { if (bootstrapPromise === actual) bootstrapPromise = null; },
  );
  return actual;
}

async function getBootstrapItems<T>(key: keyof BootstrapData): Promise<T[]> {
  const data = await getBootstrap();
  const items = data[key] as T[];
  snapshots.set(key, cloneItems(items));
  return items;
}

async function apiSync<T>(entidad: string, data: T[]): Promise<void> {
  const anterior = syncQueues.get(entidad) ?? Promise.resolve();
  const siguiente = anterior.catch(() => undefined).then(async () => {
    const prev = snapshots.get(entidad) ?? [];
    const prevById = new Map(prev.map((item: any) => [item.id, item]));
    const nextById = new Map((data as any[]).map((item) => [item.id, item]));
    const items = (data as any[]).filter((item) => {
      const old = prevById.get(item.id);
      return !old || JSON.stringify(old) !== JSON.stringify(item);
    });
    const deletedIds = prev
      .map((item: any) => item.id)
      .filter((id) => typeof id === 'string' && !nextById.has(id));

    if (items.length === 0 && deletedIds.length === 0) return;

    const res = await fetch(`${API_URL}/sync/${entidad}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ items, deletedIds }),
    });
    if (!res.ok) {
      const detalle = await res.json().catch(() => null);
      throw new Error(detalle?.error || `SYNC ${entidad} → ${res.status}`);
    }
    snapshots.set(entidad, cloneItems(data));
  });
  syncQueues.set(entidad, siguiente);
  return siguiente.finally(() => {
    if (syncQueues.get(entidad) === siguiente) syncQueues.delete(entidad);
  });
}

// La API devuelve los activos con objetos anidados (sector, tipo, etc.).
// El frontend trabaja con el activo plano (solo los *Id).
function flattenActivo(a: any): Activo {
  const copy = { ...a };
  for (const k of ['sector', 'tipo', 'responsable', 'sede', 'empresaId', 'mediciones', 'tareas']) {
    delete copy[k];
  }
  return copy as Activo;
}

/**
 * Inicializa el almacenamiento. En modo localStorage siembra los datos
 * de ejemplo; en modo remoto no hace nada (la base ya tiene su seed).
 */
export function ensureSeed(): void {
  if (useRemote) return;
  read(KEYS.activos, seedActivos);
  read(KEYS.mediciones, seedMediciones);
  read(KEYS.tareas, seedTareas);
  read(KEYS.sectores, seedSectores);
  read(KEYS.tipos, seedTipos);
  read(KEYS.tecnicos, seedTecnicos);
}

// ─────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────

export async function getActivos(): Promise<Activo[]> {
  if (useRemote) {
    const activos = (await getBootstrapItems<any>('activos')).map(flattenActivo);
    snapshots.set('activos', cloneItems(activos));
    return activos;
  }
  return read(KEYS.activos, seedActivos);
}

export async function getMediciones(): Promise<Medicion[]> {
  if (useRemote) return getBootstrapItems<Medicion>('mediciones');
  return read(KEYS.mediciones, seedMediciones);
}

export async function getTareas(): Promise<TareaMantenimiento[]> {
  if (useRemote) return getBootstrapItems<TareaMantenimiento>('tareas');
  return read(KEYS.tareas, seedTareas);
}

export async function getSectores(): Promise<Sector[]> {
  if (useRemote) return getBootstrapItems<Sector>('sectores');
  return read(KEYS.sectores, seedSectores);
}

export async function getTipos(): Promise<TipoActivo[]> {
  if (useRemote) return getBootstrapItems<TipoActivo>('tipos');
  return read(KEYS.tipos, seedTipos);
}

export async function getTecnicos(): Promise<Tecnico[]> {
  if (useRemote) return getBootstrapItems<Tecnico>('tecnicos');
  return read(KEYS.tecnicos, seedTecnicos);
}

// ─────────────────────────────────────────────────────────────
// Escrituras
// ─────────────────────────────────────────────────────────────

export async function saveActivos(data: Activo[]): Promise<void> {
  if (useRemote) return apiSync('activos', data);
  write(KEYS.activos, data);
}

export async function saveMediciones(data: Medicion[]): Promise<void> {
  if (useRemote) return apiSync('mediciones', data);
  write(KEYS.mediciones, data);
}

export async function saveTareas(data: TareaMantenimiento[]): Promise<void> {
  if (useRemote) return apiSync('tareas', data);
  write(KEYS.tareas, data);
}

export async function saveSectores(data: Sector[]): Promise<void> {
  if (useRemote) return apiSync('sectores', data);
  write(KEYS.sectores, data);
}

export async function saveTipos(data: TipoActivo[]): Promise<void> {
  if (useRemote) return apiSync('tipos', data);
  write(KEYS.tipos, data);
}

export async function saveTecnicos(data: Tecnico[]): Promise<void> {
  if (useRemote) return apiSync('tecnicos', data);
  write(KEYS.tecnicos, data);
}

export const STORAGE_KEYS = KEYS;
