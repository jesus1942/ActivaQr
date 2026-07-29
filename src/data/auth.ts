// v1.1.0
/**
 * Cliente de autenticación del frontend.
 * Guarda el token JWT en sessionStorage: la sesión se cierra al matar la app.
 */
import { encolarOperacion } from './offlineQueue';

import { API_URL } from './apiUrl';
export { API_URL };

const TOKEN_KEY = 'activaqr_token';
const USER_KEY = 'activaqr_user';

/**
 * La sesión vive en localStorage para que sobreviva a cerrar la app.
 *
 * Estaba en sessionStorage, que se borra al matar la aplicacion: el tecnico
 * que cerraba la app en el pad o en el socavon tenia que volver a iniciar
 * sesion, y eso exige conexion. Justo donde la app tiene que funcionar sin
 * señal, quedaba inutilizable aunque los datos estuvieran en el celular.
 *
 * No es un permiso indefinido: el token dura 7 dias (2 h en la cuenta demo) y
 * getToken verifica el vencimiento en el propio dispositivo, asi que la sesion
 * caduca sola aunque nunca vuelva a haber internet.
 */
const authStore = window.localStorage;

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operador';
  empresaId: string | null;
  empresa: {
    id: string;
    nombre: string;
    logoUrl?: string | null;
    estado?: string;
    plan?: string;
    mpEstadoSub?: string | null;
    esTrial?: boolean;
    trialFin?: string | null;
    trialLecturaFin?: string | null;
    fase?: 'activo' | 'lectura' | 'vencido' | null;
  } | null;
}

export function getToken(): string | null {
  const token = authStore.getItem(TOKEN_KEY);
  if (!token) return null;
  // Verificar expiración del JWT sin librería — decodificar payload base64
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expirado — limpiar sesión
      authStore.removeItem(TOKEN_KEY);
      authStore.removeItem(USER_KEY);
      return null;
    }
  } catch {
    // Token malformado — limpiar
    authStore.removeItem(TOKEN_KEY);
    authStore.removeItem(USER_KEY);
    return null;
  }
  return token;
}

export function getUsuario(): UsuarioSesion | null {
  if (!getToken()) return null; // token expirado o inválido
  try {
    const raw = authStore.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(token: string, usuario: UsuarioSesion) {
  authStore.setItem(TOKEN_KEY, token);
  authStore.setItem(USER_KEY, JSON.stringify(usuario));
}

export function logout() {
  authStore.clear();
  localStorage.clear();
}

/** Cabeceras con el token para usar en fetch. */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(
  email: string,
  password: string
): Promise<UsuarioSesion> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo iniciar sesión.');
  }
  guardarSesion(data.token, data.usuario);
  return data.usuario as UsuarioSesion;
}

export async function registro(payload: {
  empresaNombre: string;
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  aceptaPoliticas: boolean;
}): Promise<UsuarioSesion> {
  const res = await fetch(`${API_URL}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'No se pudo crear la cuenta.');
  }
  guardarSesion(data.token, data.usuario);
  return data.usuario as UsuarioSesion;
}

export class EmpresaSuspendidaError extends Error {
  constructor() {
    super('empresa_suspendida');
    this.name = 'EmpresaSuspendidaError';
  }
}

export class TrialVencidoError extends Error {
  constructor() {
    super('trial_vencido');
    this.name = 'TrialVencidoError';
  }
}

export class TrialLecturaError extends Error {
  constructor() {
    super('trial_lectura');
    this.name = 'TrialLecturaError';
  }
}

/** Llama a un endpoint protegido con el token. Timeout de 15s para evitar cuelgues. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }

  // Propagamos la suspensión como error especial para que cualquier
  // componente o hook pueda reaccionar sin necesidad de verificar manualmente.
  if (res.status === 403) {
    const data = await res.clone().json().catch(() => ({}));
    if (data?.code === 'empresa_suspendida') {
      throw new EmpresaSuspendidaError();
    }
    if (data?.code === 'trial_vencido') {
      throw new TrialVencidoError();
    }
    if (data?.code === 'trial_lectura') {
      throw new TrialLecturaError();
    }
  }

  return res;
}

/**
 * POST con soporte offline. Si la red falla (sin senal en el campo, server
 * caido temporal, etc), la operacion se encola en IndexedDB y se reintenta
 * cuando vuelva la conexion via useEstadoSync.
 *
 * Devuelve { encolada: true } si quedo offline, o { encolada: false, data }
 * si se envio. Asi el caller puede dar feedback distinto al usuario.
 */
export interface ResultadoPostOffline<T = unknown> {
  encolada: boolean;
  data?: T;
  idLocal?: string;
}

export async function apiPostOffline<T = unknown>(path: string, body: unknown): Promise<ResultadoPostOffline<T>> {
  return apiEnvioConCola<T>(path, 'POST', body);
}

/** Igual que apiPostOffline pero usando PUT. Util para cierre de OT del operario. */
export async function apiPutOffline<T = unknown>(path: string, body: unknown): Promise<ResultadoPostOffline<T>> {
  return apiEnvioConCola<T>(path, 'PUT', body);
}

async function apiEnvioConCola<T = unknown>(path: string, method: 'POST' | 'PUT' | 'PATCH', body: unknown): Promise<ResultadoPostOffline<T>> {
  try {
    const res = await apiFetch(path, { method, body: JSON.stringify(body) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || `Error ${res.status}`);
    }
    const data = (await res.json()) as T;
    return { encolada: false, data };
  } catch (err) {
    if (err instanceof EmpresaSuspendidaError || err instanceof TrialVencidoError || err instanceof TrialLecturaError) {
      throw err;
    }
    const esErrorDeRed = err instanceof TypeError || (err instanceof Error && (err.name === 'AbortError' || err.message === 'Failed to fetch'));
    if (esErrorDeRed) {
      const idLocal = await encolarOperacion(path, method, body);
      return { encolada: true, idLocal };
    }
    throw err;
  }
}
