// v1.1.0
import { apiFetch, API_URL } from './auth';

export interface PermisoAcceso {
  id: string;
  empresaId: string;
  token: string;
  estado: 'pendiente' | 'activo' | 'revocado';
  solicitadoEn: string;
  otorgadoEn: string | null;
  costoMensual: number | null;
}

export interface MensajeRemoto {
  id: string;
  autorRol: 'superadmin' | 'cliente';
  autorNombre: string;
  contenido: string | null;
  tipo: 'texto' | 'imagen' | 'audio';
  adjunto?: string | null;
  creadoEn: string;
  leido: boolean;
}

export interface MensajePayload {
  contenido?: string;
  tipo?: string;
  adjunto?: string;
}

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error en la operación.');
  return data;
}

// ── Superadmin ────────────────────────────────────────────────────────────────

export async function solicitarAccesoRemoto(
  empresaId: string,
  costoMensual?: number
): Promise<{ permiso: PermisoAcceso; linkAprobacion: string; emailEnviado: boolean }> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/acceso-remoto`, {
    method: 'POST',
    body: JSON.stringify({ costoMensual }),
  }));
}

export async function getPermisoAdmin(empresaId: string): Promise<PermisoAcceso | null> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/acceso-remoto`));
}

export async function revocarAccesoAdmin(empresaId: string): Promise<void> {
  await parse(await apiFetch(`admin/empresas/${empresaId}/acceso-remoto`, { method: 'DELETE' }));
}

export async function getActivosRemoto(empresaId: string): Promise<any[]> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/activos-remoto`));
}

export async function getMedicionesRemoto(empresaId: string, activoId?: string): Promise<any[]> {
  const qs = activoId ? `?activoId=${activoId}` : '';
  return parse(await apiFetch(`admin/empresas/${empresaId}/mediciones-remoto${qs}`));
}

export async function crearTareaRemota(
  empresaId: string,
  payload: { activoId: string; tipo: string; fechaProgramada: string; observaciones?: string }
): Promise<any> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/tareas-remoto`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}

export async function getMensajesAdmin(empresaId: string): Promise<MensajeRemoto[]> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/mensajes-remoto`));
}

export async function enviarMensajeAdmin(empresaId: string, payload: MensajePayload): Promise<MensajeRemoto> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/mensajes-remoto`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}

export async function crearMedicionRemota(
  empresaId: string,
  payload: {
    activoId: string;
    temperatura?: number;
    amperaje?: number;
    presion?: number;
    vibracion?: string;
    voltaje?: number;
    porcentajeBateria?: number;
    nivelToner?: number;
    observaciones?: string;
  }
): Promise<any> {
  return parse(await apiFetch(`admin/empresas/${empresaId}/mediciones-remoto`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}

// ── Cliente ───────────────────────────────────────────────────────────────────

export async function getSolicitudCliente(): Promise<PermisoAcceso | null> {
  return parse(await apiFetch('acceso-remoto/solicitud'));
}

export async function aprobarAccesoConToken(token: string): Promise<{ ok: boolean; permiso: PermisoAcceso }> {
  const res = await fetch(`${API_URL}/acceso-remoto/aprobar/${token}`, { method: 'POST' });
  return parse(res);
}

export async function revocarAccesoCliente(): Promise<void> {
  await parse(await apiFetch('acceso-remoto/solicitud', { method: 'DELETE' }));
}

export async function getNotificacionesCliente(): Promise<{ mensajesNoLeidos: number; tienePermisoPendiente: boolean }> {
  return parse(await apiFetch('acceso-remoto/notificaciones'));
}

export async function getMensajesCliente(): Promise<MensajeRemoto[]> {
  return parse(await apiFetch('acceso-remoto/mensajes'));
}

export async function enviarMensajeCliente(payload: MensajePayload): Promise<MensajeRemoto> {
  return parse(await apiFetch('acceso-remoto/mensajes', {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}
