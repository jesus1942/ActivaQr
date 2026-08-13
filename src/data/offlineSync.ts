import { API_URL, authHeaders, getUsuario } from './auth';
import {
  actualizarOperacion,
  borrarOperacion,
  listarPendientes,
  type OperacionPendiente,
  type ScopeOperacionOffline,
} from './offlineQueue';

const MAX_INTENTOS = 5;
const TIMEOUT_MS = 15_000;

export interface ResultadoSyncOffline {
  enviados: number;
  sinRed: boolean;
  rechazados: number;
}

export function scopeOfflineActual(): ScopeOperacionOffline | null {
  const usuario = getUsuario();
  return usuario?.empresaId
    ? { empresaId: usuario.empresaId, usuarioId: usuario.id }
    : null;
}

async function enviar(op: OperacionPendiente): Promise<'ok' | 'red' | 'server'> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/${op.path}`, {
      method: op.method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(op.body),
      signal: controller.signal,
    });
    return response.ok ? 'ok' : 'server';
  } catch {
    return 'red';
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Drena solamente las operaciones del tenant y usuario actualmente
 * autenticados. Se usa antes de cargar los snapshots remotos y tambien al
 * recuperar conectividad, para que una lectura vieja del servidor no tape un
 * cambio que el tecnico hizo offline.
 */
export async function sincronizarPendientesOffline(): Promise<ResultadoSyncOffline> {
  const scope = scopeOfflineActual();
  if (!scope || !API_URL || !navigator.onLine) {
    return { enviados: 0, sinRed: !navigator.onLine, rechazados: 0 };
  }

  const operaciones = (await listarPendientes(scope)).sort((a, b) => a.creadoEn - b.creadoEn);
  let enviados = 0;
  let rechazados = 0;

  for (const op of operaciones) {
    if (op.intentos >= MAX_INTENTOS) continue;
    const resultado = await enviar(op);
    if (resultado === 'ok') {
      await borrarOperacion(op.id);
      enviados++;
      continue;
    }
    if (resultado === 'red') return { enviados, sinRed: true, rechazados };
    await actualizarOperacion(op.id, {
      intentos: op.intentos + 1,
      ultimoError: 'El servidor rechazo la operacion.',
    });
    rechazados++;
  }

  return { enviados, sinRed: false, rechazados };
}
