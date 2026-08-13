import { API_URL } from './apiUrl';
import {
  actualizarUsuarioSesion,
  authHeaders,
  limpiarSesion,
  getToken,
  UsuarioSesion,
} from './auth';
import { sincronizarPendientesOffline } from './offlineSync';

const PAUSAS_MS = [0, 700];
const TIMEOUT_INTENTO_MS = 4_000;

const esperar = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Despierta la API y comprueba la base antes de montar las pantallas que
 * disparan varias lecturas simultaneas. Si hay una sesion guardada, /auth/me
 * valida ademas el JWT y refresca los datos del usuario.
 *
 * La app sigue pudiendo abrir offline: cuando el navegador declara que no hay
 * red no esperamos a Railway y dejamos que las vistas usen su cache local.
 */
export async function prepararInicio(): Promise<void> {
  if (!API_URL || !navigator.onLine) return;

  let ultimoError: unknown;

  for (const pausa of PAUSAS_MS) {
    if (pausa) await esperar(pausa);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_INTENTO_MS);
    const haySesion = Boolean(getToken());
    const endpoint = haySesion ? 'auth/me' : 'health';

    try {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        headers: haySesion ? authHeaders() : undefined,
        cache: 'no-store',
        signal: controller.signal,
      });

      if (haySesion && response.status === 401) {
        limpiarSesion();
        return;
      }

      if (!response.ok) throw new Error(`Inicio API ${response.status}`);

      if (haySesion) {
        const usuario = (await response.json()) as UsuarioSesion;
        actualizarUsuarioSesion(usuario);
        // Reproducir cambios offline antes de que las pantallas descarguen el
        // snapshot remoto evita que datos viejos tapen lo hecho en campo.
        await sincronizarPendientesOffline();
      }
      return;
    } catch (error) {
      ultimoError = error;
      if (!navigator.onLine) return;
    } finally {
      window.clearTimeout(timer);
    }
  }

  // navigator.onLine tambien es true cuando hay Wi-Fi sin salida a Internet.
  // En ese caso no bloqueamos la PWA: montamos la copia local y los hooks
  // reintentan/sincronizan al recuperar conectividad real.
  console.warn('[startup] API no disponible; continuamos con la copia offline.', ultimoError);
}
