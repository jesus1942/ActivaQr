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
const DB_VERSION = 2;
const STORE = 'pending';

export interface ScopeOperacionOffline {
  empresaId: string;
  usuarioId: string;
}

interface OperacionPendiente extends ScopeOperacionOffline {
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

export async function encolarOperacion(
  path: string,
  method: OperacionPendiente['method'],
  body: unknown,
  scope: ScopeOperacionOffline,
): Promise<string> {
  const db = await abrirDB();
  const id = genId();
  const op: OperacionPendiente = {
    id,
    path,
    method,
    body,
    creadoEn: Date.now(),
    intentos: 0,
    ...scope,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(op);
    tx.oncomplete = () => { db.close(); resolve(id); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function listarPendientes(scope: ScopeOperacionOffline): Promise<OperacionPendiente[]> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      // Las filas de v1 no tenian tenant. Se dejan en cuarentena en vez de
      // enviarlas con la sesion que casualmente este abierta: eso podria
      // mezclar datos entre empresas en un dispositivo compartido.
      resolve((req.result as OperacionPendiente[]).filter((op) =>
        op.empresaId === scope.empresaId && op.usuarioId === scope.usuarioId
      ));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function contarPendientes(scope: ScopeOperacionOffline): Promise<number> {
  return (await listarPendientes(scope)).length;
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
