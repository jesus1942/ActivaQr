/**
 * Cola offline de operaciones pendientes (basada en IndexedDB).
 *
 * Caso de uso: el tecnico en campo carga una medicion sin senal. La
 * operacion queda guardada en el celular y se reintenta automaticamente
 * cuando vuelve la conexion.
 *
 * Soporta cualquier POST de la API. Por ahora se usa para mediciones del
 * operario, pero la cola es generica y se puede extender a tareas, etc.
 *
 * Sin dependencias: IndexedDB nativo del navegador.
 */

const DB_NAME = 'activaqr-offline';
const DB_VERSION = 1;
const STORE = 'pending';

interface OperacionPendiente {
  id: string;
  path: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: unknown;
  creadoEn: number;
  intentos: number;
  ultimoError?: string;
}

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

function genId(): string {
  // uuid simple (no necesita crypto fuerte, es solo para identificar la fila)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function encolarOperacion(path: string, method: OperacionPendiente['method'], body: unknown): Promise<string> {
  const db = await abrirDB();
  const id = genId();
  const op: OperacionPendiente = {
    id,
    path,
    method,
    body,
    creadoEn: Date.now(),
    intentos: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(op);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listarPendientes(): Promise<OperacionPendiente[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result as OperacionPendiente[]); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function contarPendientes(): Promise<number> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function actualizarOperacion(id: string, cambios: Partial<OperacionPendiente>): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const actual = req.result as OperacionPendiente | undefined;
      if (!actual) { db.close(); return resolve(); }
      store.put({ ...actual, ...cambios });
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function borrarOperacion(id: string): Promise<void> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export type { OperacionPendiente };
