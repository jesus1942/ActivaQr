import { apiFetch } from './auth';

export type NivelAlerta = 'desmejorado' | 'riesgo' | 'critico';
export type EstadoAlerta = 'abierta' | 'propuesta_emitida' | 'autorizada' | 'rechazada' | 'riesgo_aceptado' | 'cerrada';
export type EstadoOrden = 'autorizada' | 'programada' | 'en_progreso' | 'completada' | 'cancelada';
export type EstadoPermiso = 'no_requerido' | 'pendiente' | 'aprobado' | 'rechazado' | 'vencido';

export interface OrdenCorrectiva {
  id: string;
  numero: string;
  estado: EstadoOrden;
  alcance: string;
  materialesPrevistos: string | null;
  plazoEstimadoDias: number;
  costoAprobado: number;
  moneda: string;
  requierePermiso: boolean;
  estadoPermiso: EstadoPermiso;
  permisoCondiciones: string | null;
  permisoValidoDesde: string | null;
  permisoValidoHasta: string | null;
  permisoAprobadoPorNombre: string | null;
  autorizadaPorNombre: string;
  autorizadaEn: string;
  programadaPara: string | null;
  responsableNombre: string | null;
  iniciadaEn: string | null;
  finalizadaEn: string | null;
  cierreTrabajo: string | null;
  repuestosUtilizados: string | null;
  horasTrabajo: number | null;
  evidencias: string[] | null;
  conformidadCliente: 'pendiente' | 'conforme' | 'observada';
  conformidadDetalle: string | null;
}

export interface AlertaTecnica {
  id: string;
  numero: string;
  empresaId: string;
  nivel: NivelAlerta;
  estado: EstadoAlerta;
  hallazgo: string;
  riesgo: string;
  recomendacion: string;
  recomiendaDetencion: boolean;
  decisionCliente: 'detener_aislar' | 'continuar_operando' | null;
  decisionDetalle: string | null;
  decisionPorNombre: string | null;
  decisionEn: string | null;
  creadaPorNombre: string;
  creadaEn: string;
  empresa: { id: string; nombre: string };
  activo: { id: string; codigo: string; nombre: string; estado: string; estadoOperativo: string };
  medicion: {
    id: string; fecha: string; temperatura: number | null; amperaje: number | null;
    presion: number | null; vibracion: string; voltaje: number | null;
    porcentajeBateria: number | null; nivelToner: number | null;
    estado: string; observaciones: string | null;
  } | null;
  cotizacion: { id: string; numero: string; estado: string; total: number; vigenciaHasta: string } | null;
  orden: OrdenCorrectiva | null;
}

export interface PropuestaCorrectivaPayload {
  nivel: NivelAlerta;
  hallazgo: string;
  riesgo: string;
  recomendacion: string;
  recomiendaDetencion: boolean;
  alcance: string;
  materialesPrevistos?: string;
  condicionesSeguridad?: string;
  manoObra: number;
  repuestos: number;
  traslado: number;
  otros: number;
  descuento: number;
  vigenciaDias: number;
  plazoEstimadoDias: number;
  requierePermiso: boolean;
}

async function parse<T>(respuesta: Response): Promise<T> {
  const data = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(data?.error || 'No se pudo completar la operación.');
  return data as T;
}

export async function listarCorrectivosAdmin(empresaId?: string): Promise<AlertaTecnica[]> {
  const query = empresaId ? `?empresaId=${encodeURIComponent(empresaId)}` : '';
  return parse(await apiFetch(`admin/correctivos${query}`));
}

export async function listarMisCorrectivos(): Promise<AlertaTecnica[]> {
  return parse(await apiFetch('correctivos'));
}

export async function crearPropuestaCorrectiva(id: string, payload: PropuestaCorrectivaPayload) {
  return parse<{ ok: true; cotizacionId: string; numero: string }>(await apiFetch(`admin/correctivos/${id}/propuesta`, {
    method: 'POST', body: JSON.stringify(payload),
  }));
}

export async function registrarDecisionOperativa(id: string, decision: 'detener_aislar' | 'continuar_operando', detalle: string) {
  return parse<AlertaTecnica>(await apiFetch(`correctivos/${id}/decision-operativa`, {
    method: 'POST', body: JSON.stringify({ decision, detalle }),
  }));
}

export async function resolverPermiso(
  id: string,
  payload: { decision: 'aprobar' | 'rechazar'; condiciones: string; validoDesde?: string; validoHasta?: string },
) {
  return parse<OrdenCorrectiva>(await apiFetch(`correctivos/ordenes/${id}/permiso`, {
    method: 'POST', body: JSON.stringify(payload),
  }));
}

export async function actualizarEstadoOrden(id: string, payload: Record<string, unknown>) {
  return parse<OrdenCorrectiva>(await apiFetch(`admin/correctivos/ordenes/${id}/estado`, {
    method: 'POST', body: JSON.stringify(payload),
  }));
}

export async function registrarConformidad(id: string, decision: 'conforme' | 'observada', detalle: string) {
  return parse<OrdenCorrectiva>(await apiFetch(`correctivos/ordenes/${id}/conformidad`, {
    method: 'POST', body: JSON.stringify({ decision, detalle }),
  }));
}
