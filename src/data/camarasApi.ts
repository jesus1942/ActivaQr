import { apiFetch } from './auth';

async function parse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'No se pudo completar la operación.');
  return data as T;
}

export type ProveedorCamara = 'onvif' | 'frigate' | 'hikvision' | 'dahua' | 'reolink' | 'tuya' | 'generico';

export interface IntegracionCamara {
  id: string;
  nombre: string;
  proveedor: ProveedorCamara;
  estado: string;
  configuracion?: Record<string, unknown> | null;
  webhookTokenHint?: string | null;
  ultimoEventoEn?: string | null;
  ultimoError?: string | null;
  credencialesConfiguradas: boolean;
}

export interface Camara {
  id: string;
  integracionId: string;
  identificadorExterno: string;
  nombre: string;
  ubicacion?: string | null;
  modelo?: string | null;
  estado: string;
  habilitada: boolean;
  reproduccionUrl?: string | null;
  protocoloReproduccion?: 'hls' | 'webrtc' | 'jpeg' | null;
  capacidades?: { vivo?: boolean; movimiento?: boolean; ptz?: boolean; audio?: boolean } | null;
  ultimoContactoEn?: string | null;
  ultimoMovimientoEn?: string | null;
  integracion: { proveedor: ProveedorCamara; nombre: string };
}

export interface EventoCamara {
  id: string;
  tipo: string;
  etiqueta?: string | null;
  zona?: string | null;
  confianza?: number | null;
  iniciadoEn: string;
  finalizadoEn?: string | null;
  snapshotUrl?: string | null;
  clipUrl?: string | null;
  camara: { nombre: string; ubicacion?: string | null };
}

export interface MovimientoHora {
  inicio: string;
  total: number;
  movimiento: number;
  personas: number;
  vehiculos: number;
}

export interface ResumenCamaras {
  integraciones: IntegracionCamara[];
  camaras: Camara[];
  eventos: EventoCamara[];
  movimientosPorHora: MovimientoHora[];
}

export async function resumenCamaras(): Promise<ResumenCamaras> {
  return parse<ResumenCamaras>(await apiFetch('camaras/resumen'));
}

export async function crearIntegracionCamara(data: { nombre: string; proveedor: ProveedorCamara }): Promise<IntegracionCamara> {
  return parse<IntegracionCamara>(await apiFetch('camaras/integraciones', { method: 'POST', body: JSON.stringify(data) }));
}

export async function generarTokenCamara(integracionId: string): Promise<{ token: string; endpoint: string; advertencia: string }> {
  return parse(await apiFetch(`camaras/integraciones/${integracionId}/webhook-token`, { method: 'POST' }));
}

export async function crearCamara(data: { integracionId: string; nombre: string; identificadorExterno: string; ubicacion?: string; modelo?: string; reproduccionUrl?: string; protocoloReproduccion?: string }): Promise<Camara> {
  return parse<Camara>(await apiFetch('camaras/equipos', { method: 'POST', body: JSON.stringify(data) }));
}

export async function actualizarCamara(id: string, data: Record<string, unknown>): Promise<Camara> {
  return parse<Camara>(await apiFetch(`camaras/equipos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}
