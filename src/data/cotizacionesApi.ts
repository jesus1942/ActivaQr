import { apiFetch } from './auth';

export type EstadoCotizacion = 'borrador' | 'enviada' | 'vista' | 'aceptada' | 'rechazada' | 'vencida';
export type CanalCotizacion = 'plataforma' | 'email' | 'whatsapp' | 'telegram';

export interface DetalleCotizacion {
  activos: number;
  visitasMes: number;
  horasVisita: number;
  valorHora: number;
  valorActivo: number;
  kilometrosVisita: number;
  valorKilometro: number;
  viaticosVisita: number;
  extrasMensuales: number;
  descuentoPorcentaje: number;
  porVisita: number;
  notas: string | null;
}

export interface EnvioCotizacion {
  id: string;
  canal: CanalCotizacion;
  estado: 'enviado' | 'preparado' | 'error';
  detalle: string | null;
  creadoEn: string;
}

export interface MensajeCotizacion {
  id: string;
  autorRol: 'superadmin' | 'cliente';
  autorNombre: string;
  contenido: string;
  creadoEn: string;
}

export interface Cotizacion {
  id: string;
  numero: string;
  empresaId: string;
  empresa: { id: string; nombre: string };
  clienteNombre: string;
  contactoNombre: string | null;
  contactoEmail: string | null;
  contactoTelefono: string | null;
  concepto: string;
  planSoftware: string;
  detalle: DetalleCotizacion;
  moneda: 'ARS';
  subtotal: number;
  descuento: number;
  total: number;
  vigenciaHasta: string;
  estado: EstadoCotizacion;
  creadaEn: string;
  actualizadaEn: string;
  enviadaEn: string | null;
  vistaEn: string | null;
  respondidaEn: string | null;
  telegramDisponible: boolean;
  texto: string;
  envios: EnvioCotizacion[];
  mensajes: MensajeCotizacion[];
}

export interface NuevaCotizacionPayload {
  empresaId: string;
  contactoId?: string;
  concepto: string;
  planSoftware: string;
  activos: number;
  visitasMes: number;
  horasVisita: number;
  valorHora: number;
  valorActivo: number;
  kilometrosVisita: number;
  valorKilometro: number;
  viaticosVisita: number;
  extrasMensuales: number;
  descuento: number;
  vigenciaDias: number;
  notas?: string;
}

async function parse<T>(respuesta: Response): Promise<T> {
  const data = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(data?.error || 'No se pudo completar la operación.');
  return data as T;
}

export async function listarCotizacionesAdmin(empresaId?: string): Promise<Cotizacion[]> {
  const query = empresaId ? `?empresaId=${encodeURIComponent(empresaId)}` : '';
  return parse(await apiFetch(`admin/cotizaciones${query}`));
}

export async function crearCotizacion(payload: NuevaCotizacionPayload): Promise<Cotizacion> {
  return parse(await apiFetch('admin/cotizaciones', {
    method: 'POST',
    body: JSON.stringify(payload),
  }));
}

export async function enviarCotizacion(
  id: string,
  canal: CanalCotizacion,
): Promise<{ ok: true; cotizacion?: Cotizacion; url?: string; estadoEnvio?: string }> {
  return parse(await apiFetch(`admin/cotizaciones/${id}/enviar`, {
    method: 'POST',
    body: JSON.stringify({ canal }),
  }));
}

export async function enviarMensajeCotizacionAdmin(id: string, contenido: string): Promise<MensajeCotizacion> {
  return parse(await apiFetch(`admin/cotizaciones/${id}/mensajes`, {
    method: 'POST',
    body: JSON.stringify({ contenido }),
  }));
}

export async function listarMisCotizaciones(): Promise<Cotizacion[]> {
  return parse(await apiFetch('cotizaciones'));
}

export async function responderCotizacion(
  id: string,
  accion: 'aceptar' | 'rechazar' | 'consultar',
  mensaje?: string,
): Promise<{ ok: true; estado: EstadoCotizacion; mensaje: MensajeCotizacion }> {
  return parse(await apiFetch(`cotizaciones/${id}/responder`, {
    method: 'POST',
    body: JSON.stringify({ accion, mensaje }),
  }));
}
