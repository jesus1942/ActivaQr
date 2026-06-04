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
import { API_URL, authHeaders } from '../data/auth';
import {
  listarPendientes,
  contarPendientes,
  borrarOperacion,
  actualizarOperacion,
  OperacionPendiente,
} from '../data/offlineQueue';

const INTERVALO_REINTENTO_MS = 30_000;
const MAX_INTENTOS = 5;

export function useEstadoSync() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pendientes, setPendientes] = useState<number>(0);
  const [drenando, setDrenando] = useState<boolean>(false);
  const [errorSync, setErrorSync] = useState<string | null>(null);
  const drenandoRef = useRef(false);

  const refrescarConteo = useCallback(async () => {
    try {
      setPendientes(await contarPendientes());
    } catch {
      // si IndexedDB falla, no rompemos la UI
    }
  }, []);

  const enviarUna = useCallback(async (op: OperacionPendiente): Promise<'ok' | 'red' | 'server'> => {
    try {
      const res = await fetch(`${API_URL}/${op.path}`, {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify(op.body),
      });
      if (res.ok) return 'ok';
      // Error 401/403: no tiene sentido reintentar muchas veces. Dejarlo igual en cola pero marcar intento.
      return 'server';
    } catch {
      // TypeError → red. No incrementar intentos, esperar a que vuelva la conexion.
      return 'red';
    }
  }, []);

  const drenarAhora = useCallback(async () => {
    if (drenandoRef.current) return;
    if (!navigator.onLine) return;
    drenandoRef.current = true;
    setDrenando(true);
    setErrorSync(null);
    try {
      const ops = await listarPendientes();
      const ordenadas = ops.sort((a, b) => a.creadoEn - b.creadoEn);
      for (const op of ordenadas) {
        // No reintentar las que ya fallaron muchas veces hasta que el usuario actue.
        if (op.intentos >= MAX_INTENTOS) continue;
        const resultado = await enviarUna(op);
        if (resultado === 'ok') {
          await borrarOperacion(op.id);
        } else if (resultado === 'server') {
          await actualizarOperacion(op.id, { intentos: op.intentos + 1, ultimoError: 'El servidor rechazo la operacion.' });
        } else {
          // red caida en medio del drenado: cortar y esperar
          break;
        }
      }
    } catch (e) {
      setErrorSync(e instanceof Error ? e.message : 'Error al sincronizar');
    } finally {
      drenandoRef.current = false;
      setDrenando(false);
      await refrescarConteo();
    }
  }, [enviarUna, refrescarConteo]);

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
    if (!online || pendientes === 0) return;
    const iv = setInterval(() => { drenarAhora(); }, INTERVALO_REINTENTO_MS);
    return () => clearInterval(iv);
  }, [online, pendientes, drenarAhora]);

  return { online, pendientes, drenando, errorSync, drenarAhora, refrescarConteo };
}
