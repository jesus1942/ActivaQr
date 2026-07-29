import { API_URL } from './apiUrl';
import {
  actualizarUsuarioSesion,
  authHeaders,
  limpiarSesion,
  getToken,
  UsuarioSesion,
} from './auth';

const PAUSAS_MS = [0, 700, 1_400, 2_500, 4_000, 5_000];
const TIMEOUT_INTENTO_MS = 6_000;

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

  while (navigator.onLine) {
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

        if (haySesion && (response.status === 401 || response.status === 404)) {
          limpiarSesion();
          return;
        }

        if (!response.ok) {
          throw new Error(`Inicio API ${response.status}`);
        }

        if (haySesion) {
          const usuario = (await response.json()) as UsuarioSesion;
          actualizarUsuarioSesion(usuario);
        }
        return;
      } catch (error) {
        ultimoError = error;
        if (!navigator.onLine) return;
      } finally {
        window.clearTimeout(timer);
      }
    }

    // El servidor sigue despertando: mantenemos el fondo oscuro y volvemos a
    // probar. No montamos las vistas ni convertimos esta espera en un error.
    console.warn('[startup] La API sigue iniciando; reintentamos.', ultimoError);
    await esperar(8_000);
  }
}
