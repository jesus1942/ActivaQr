import { apiFetch } from './auth';

export interface EstadoPoliticas {
  politicasAceptadasEn: string | null;
  politicasVersion: string | null;
  politicasVersionVigente: string;
  requiereAceptarPoliticas: boolean;
  sinEmpresa?: boolean;
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error en la operacion.');
  return data;
}

export async function getEstadoPoliticas(): Promise<EstadoPoliticas> {
  return parse(await apiFetch('cuenta/estado-politicas'));
}

export async function aceptarPoliticas(): Promise<{ ok: boolean; politicasAceptadasEn: string; politicasVersion: string }> {
  return parse(await apiFetch('cuenta/aceptar-politicas', { method: 'POST' }));
}
