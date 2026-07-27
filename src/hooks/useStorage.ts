// v1.1.0
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';

// Contador global de claves remotas pendientes de carga.
let _pendientes = 0;
const _listeners = new Set<() => void>();
const _notificar = () => _listeners.forEach((fn) => fn());
export const cargaRemotaStore = {
  subscribe: (fn: () => void) => { _listeners.add(fn); return () => _listeners.delete(fn); },
  getSnapshot: () => _pendientes > 0,
};
export function useCargaRemota() {
  return useSyncExternalStore(cargaRemotaStore.subscribe, cargaRemotaStore.getSnapshot);
}

// ── Estado global de errores de sincronizacion ────────────────────────────
// Si CUALQUIER entidad fallo al cargar desde el backend, el flag se
// enciende y bloquea TODOS los syncs subsiguientes. Sin esto, una falla
// de red en el GET inicial hacia que el sync borrara la BD del cliente
// (deleteMany con array vacio).
let _errorSync: string | null = null;
const _errorListeners = new Set<() => void>();
const _notificarError = () => _errorListeners.forEach((fn) => fn());
export const errorSyncStore = {
  subscribe: (fn: () => void) => { _errorListeners.add(fn); return () => _errorListeners.delete(fn); },
  getSnapshot: () => _errorSync,
};
export function useErrorSync() {
  return useSyncExternalStore(errorSyncStore.subscribe, errorSyncStore.getSnapshot);
}
export function syncEstaBloqueado(): boolean {
  return _errorSync !== null;
}
import {
  useRemote,
  getActivos,
  getMediciones,
  getTareas,
  getSectores,
  getTipos,
  getTecnicos,
  saveActivos,
  saveMediciones,
  saveTareas,
  saveSectores,
  saveTipos,
  saveTecnicos,
} from '../data/store';

import { getUsuario } from '../data/auth';

/**
 * Clave de la copia local, siempre atada a la empresa de la sesion activa.
 * Sin ese prefijo, dos cuentas usadas en el mismo dispositivo podrian verse
 * los datos entre si. Si no hay sesion, no se cachea nada.
 */
function claveCache(key: string): string | null {
  const usuario = getUsuario();
  if (!usuario?.empresaId) return null;
  return `aqr_cache_${usuario.empresaId}_${key}`;
}

function guardarCache(key: string, data: unknown): void {
  const ck = claveCache(key);
  if (!ck) return;
  try {
    localStorage.setItem(ck, JSON.stringify(data));
  } catch {
    // Sin espacio en el dispositivo: la app sigue andando contra la API.
  }
}

// Mapa clave → funciones remotas de la API.
const remoteGet: Record<string, () => Promise<any>> = {
  activos: getActivos,
  mediciones: getMediciones,
  tareas: getTareas,
  sectores: getSectores,
  tipos: getTipos,
  tecnicos: getTecnicos,
};
const remoteSave: Record<string, (d: any) => Promise<void>> = {
  activos: saveActivos,
  mediciones: saveMediciones,
  tareas: saveTareas,
  sectores: saveSectores,
  tipos: saveTipos,
  tecnicos: saveTecnicos,
};

/**
 * Hook de persistencia.
 * - Modo remoto (VITE_API_URL): carga desde la API y guarda los cambios en ella.
 * - Modo local: usa localStorage (demo / offline).
 *
 * Mantiene la misma firma `[value, setValue]` que la versión original,
 * así el resto de la app no cambia.
 */
export function useStorage<T>(key: string, initialValue: T) {
  // Copia local de lo ultimo que devolvio la API. Permite abrir la app
  // mostrando datos al instante mientras se refresca por detras, en vez de
  // tapar todo con la pantalla de carga durante un viaje a la nube.
  const leerCache = (): { valor: T; hubo: boolean } => {
    try {
      const ck = claveCache(key);
      if (!ck) return { valor: initialValue, hubo: false };
      const item = localStorage.getItem(ck);
      if (!item) return { valor: initialValue, hubo: false };
      return { valor: JSON.parse(item) as T, hubo: true };
    } catch {
      return { valor: initialValue, hubo: false };
    }
  };

  const cacheInicial = useRef<{ valor: T; hubo: boolean } | null>(null);
  if (cacheInicial.current === null) {
    cacheInicial.current = useRemote
      ? leerCache()
      : (() => {
          try {
            const item = localStorage.getItem(key);
            return { valor: item ? (JSON.parse(item) as T) : initialValue, hubo: !!item };
          } catch {
            return { valor: initialValue, hubo: false };
          }
        })();
  }

  const [value, setValueState] = useState<T>(cacheInicial.current.valor);

  // En local ya está cargado; en remoto, hasta que llegue la API no persistimos.
  const cargado = useRef(!useRemote);
  const omitirGuardado = useRef(false);

  // Carga inicial desde la API (solo modo remoto).
  useEffect(() => {
    if (!useRemote) return;
    let cancelado = false;
    const fn = remoteGet[key];
    if (!fn) {
      cargado.current = true;
      return;
    }
    // Solo se tapa la app con la pantalla de carga si no hay nada que mostrar.
    // Con datos en cache, el refresco ocurre en segundo plano.
    const bloquea = !cacheInicial.current!.hubo;
    if (bloquea) {
      _pendientes++;
      _notificar();
    }
    fn().then((data) => {
      if (cancelado) return;
      omitirGuardado.current = true;
      setValueState(data as T);
      cargado.current = true;
      guardarCache(key, data);
    }).catch((e) => {
      if (cancelado) return;
      // CRITICO: si el GET falla, NO marcar cargado=true. Eso disparaba
      // el sync con el array inicial vacio y BORRABA la BD del cliente.
      console.error(`[useStorage] Error cargando "${key}":`, e);
      _errorSync = `No se pudieron cargar los ${key} del servidor. Recargá la página o revisá tu conexión.`;
      _notificarError();
    }).finally(() => {
      if (!cancelado && bloquea) { _pendientes = Math.max(0, _pendientes - 1); _notificar(); }
    });
    return () => {
      cancelado = true;
      if (bloquea) {
        _pendientes = Math.max(0, _pendientes - 1);
        _notificar();
      }
    };
  }, [key]);

  // Persistencia de los cambios.
  useEffect(() => {
    if (!cargado.current) return;
    if (omitirGuardado.current) {
      omitirGuardado.current = false;
      return;
    }
    if (useRemote) {
      // CRITICO: si CUALQUIER entidad fallo al cargar, no persistir
      // NADA. El estado local puede ser inconsistente con el backend
      // y el sync de delete-rest borraria datos del cliente.
      if (_errorSync) {
        console.warn(`[useStorage] Sync bloqueado por error previo, descartando save de "${key}".`);
        return;
      }
      const fn = remoteSave[key];
      if (fn) {
        void fn(value).catch((e) => {
          console.error(`[useStorage] Error guardando "${key}":`, e);
          _errorSync = e instanceof Error ? e.message : `No se pudieron guardar los ${key}.`;
          _notificarError();
        });
      }
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, [key, value]);

  // setValue compatible con la firma de useState (valor o updater).
  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValueState((prev) =>
        typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
      );
    },
    []
  );

  return [value, setValue] as const;
}
