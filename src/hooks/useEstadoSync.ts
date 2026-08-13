/**
 * Hook que monitorea el estado de la cola offline y la sincroniza
 * cuando hay conexion.
 *
 * Expone:
 *  - online: si el navegador reporta conexion.
 *  - pendientes: cantidad de operaciones offline en cola.
 *  - drenando: si esta enviando ahora mismo.
 *  - errorSync: ultimo error de drenado, si lo hubo.
 *  - drenarAhora(): fuerza un intento manual.
 *
 * Estrategia de drenado:
 *  - Al volver online → drenar.
 *  - Cada 30 segundos si hay pendientes y online → drenar.
 *  - Al montar el hook → drenar (por si quedaron de sesion previa).
 *
 * El drenado envia las operaciones una por una. Si una falla con error de
 * red, se queda en la cola para el proximo intento. Si falla con error del
 * server (4xx/5xx), se incrementa `intentos` y se guarda el mensaje. A los
 * 5 intentos seguidos con error del server, queda marcada pero no se borra
 * (para que el usuario pueda decidir).
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { contarPendientes } from '../data/offlineQueue';
import { scopeOfflineActual, sincronizarPendientesOffline } from '../data/offlineSync';
import { reintentarCargasRemotas } from './useStorage';

const INTERVALO_REINTENTO_MS = 30_000;
export function useEstadoSync() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pendientes, setPendientes] = useState<number>(0);
  const [drenando, setDrenando] = useState<boolean>(false);
  const [errorSync, setErrorSync] = useState<string | null>(null);
  const drenandoRef = useRef(false);

  const refrescarConteo = useCallback(async () => {
    try {
      const scope = scopeOfflineActual();
      setPendientes(scope ? await contarPendientes(scope) : 0);
    } catch {
      // si IndexedDB falla, no rompemos la UI
    }
  }, []);

  const drenarAhora = useCallback(async () => {
    if (drenandoRef.current) return;
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }
    drenandoRef.current = true;
    setDrenando(true);
    setErrorSync(null);
    try {
      const resultado = await sincronizarPendientesOffline();
      setOnline(!resultado.sinRed);
      if (resultado.rechazados > 0) setErrorSync('El servidor rechazó una operación pendiente.');
      if (resultado.enviados > 0) reintentarCargasRemotas();
    } catch (e) {
      setErrorSync(e instanceof Error ? e.message : 'Error al sincronizar');
    } finally {
      drenandoRef.current = false;
      setDrenando(false);
      await refrescarConteo();
    }
  }, [refrescarConteo]);

  // Eventos de online/offline + drenado inicial.
  useEffect(() => {
    const handleOnline = () => { setOnline(true); drenarAhora(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refrescarConteo();
    drenarAhora();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [drenarAhora, refrescarConteo]);

  // Reintento periodico mientras haya pendientes y online.
  useEffect(() => {
    if (!navigator.onLine || pendientes === 0) return;
    const iv = setInterval(() => { drenarAhora(); }, INTERVALO_REINTENTO_MS);
    return () => clearInterval(iv);
  }, [online, pendientes, drenarAhora]);

  return { online, pendientes, drenando, errorSync, drenarAhora, refrescarConteo };
}
