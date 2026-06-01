// v1.1.0
/**
 * Cliente de autenticación del frontend.
 * Guarda el token JWT en sessionStorage: la sesión se cierra al matar la app.
 */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL;

const TOKEN_KEY = 'activaqr_token';
const USER_KEY = 'activaqr_user';

// La sesión vive en sessionStorage para que se cierre cuando se mata la app.
const authStore = window.sessionStorage;

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operador';
  empresaId: string | null;
  empresa: { id: string; nombre: string; logoUrl?: string | null; estado?: string; plan?: string; mpEstadoSub?: string | null } | null;
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

export class EmpresaSuspendidaError extends Error {
  constructor() {
    super('empresa_suspendida');
    this.name = 'EmpresaSuspendidaError';
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
  }

  return res;
}
