import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [value, setValueState] = useState<T>(() => {
    if (useRemote) return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

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
    fn().then((data) => {
      if (cancelado) return;
      omitirGuardado.current = true; // no re-enviar lo que acabamos de traer
      setValueState(data as T);
      cargado.current = true;
    });
    return () => {
      cancelado = true;
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
      const fn = remoteSave[key];
      if (fn) void fn(value);
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
