import { apiFetch } from './auth';

export interface Operador {
  id: string;
  nombre: string;
  email: string;
  cargo?: string | null;
  telefono?: string | null;
  activo: boolean;
  creadoEn?: string;
  ultimoAcceso?: string | null;
}

export async function getOperadores(): Promise<Operador[]> {
  const res = await apiFetch('operadores');
  if (!res.ok) throw new Error('Error al cargar operadores');
  return res.json();
}

export async function actualizarOperador(id: string, data: { nombre?: string; cargo?: string | null }): Promise<Operador> {
  const res = await apiFetch(`operadores/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error al actualizar operador');
  return body;
}

export async function crearOperador(data: { nombre: string; email: string; password: string; cargo?: string }): Promise<Operador> {
  const res = await apiFetch('operadores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Error al crear operador');
  return body;
}

export async function desactivarOperador(id: string): Promise<void> {
  const res = await apiFetch(`operadores/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al desactivar operador');
  }
}

export async function resetPasswordOperador(id: string, password: string): Promise<void> {
  const res = await apiFetch(`operadores/${id}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Error al resetear contraseña');
  }
}
