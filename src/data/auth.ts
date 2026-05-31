/**
 * Cliente de autenticación del frontend.
 * Guarda el token JWT en localStorage y lo adjunta a las requests.
 */
export const API_URL: string | undefined = import.meta.env.VITE_API_URL;

const TOKEN_KEY = 'activaqr_token';
const USER_KEY = 'activaqr_user';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operador';
  empresaId: string | null;
  empresa: { id: string; nombre: string; logoUrl?: string | null; estado?: string; plan?: string; mpEstadoSub?: string | null } | null;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsuario(): UsuarioSesion | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UsuarioSesion) : null;
  } catch {
    return null;
  }
}

function guardarSesion(token: string, usuario: UsuarioSesion) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
