import { apiFetch } from './auth';

export interface TestimonioPublico {
  id: string;
  nombre: string;
  rol: string | null;
  mensaje: string;
  destacado: boolean;
  aprobadoEn: string | null;
}

export interface TestimonioAdmin extends TestimonioPublico {
  email: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  ip: string | null;
  userAgent: string | null;
  creadoEn: string;
}

export interface NuevoTestimonio {
  nombre: string;
  rol?: string;
  email?: string;
  mensaje: string;
}

// Publico: lista solo aprobados, sin PII.
export async function getTestimoniosPublicos(): Promise<TestimonioPublico[]> {
  const r = await apiFetch('testimonios');
  if (!r.ok) throw new Error('No se pudieron cargar los testimonios.');
  return r.json();
}

// Publico: enviar un testimonio (queda pendiente).
export async function enviarTestimonio(data: NuevoTestimonio): Promise<{ ok: boolean; mensaje: string }> {
  const r = await apiFetch('testimonios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error ?? 'No se pudo enviar tu testimonio.');
  }
  return r.json();
}

// Superadmin: lista todos, con filtro opcional por estado.
export async function getTestimoniosAdmin(estado?: 'pendiente' | 'aprobado' | 'rechazado'): Promise<TestimonioAdmin[]> {
  const path = estado ? `admin/testimonios?estado=${estado}` : 'admin/testimonios';
  const r = await apiFetch(path);
  if (!r.ok) throw new Error('No se pudieron cargar los testimonios.');
  return r.json();
}

export async function aprobarTestimonio(id: string): Promise<void> {
  const r = await apiFetch(`admin/testimonios/${id}/aprobar`, { method: 'POST' });
  if (!r.ok) throw new Error('No se pudo aprobar.');
}

export async function rechazarTestimonio(id: string): Promise<void> {
  const r = await apiFetch(`admin/testimonios/${id}/rechazar`, { method: 'POST' });
  if (!r.ok) throw new Error('No se pudo rechazar.');
}

export async function destacarTestimonio(id: string): Promise<void> {
  const r = await apiFetch(`admin/testimonios/${id}/destacar`, { method: 'POST' });
  if (!r.ok) throw new Error('No se pudo destacar.');
}

export async function eliminarTestimonio(id: string): Promise<void> {
  const r = await apiFetch(`admin/testimonios/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('No se pudo eliminar.');
}
