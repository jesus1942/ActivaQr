// v1.1.0
import { apiFetch } from './auth';

export interface EmpresaAdmin {
  id: string;
  nombre: string;
  cuit: string | null;
  plan: 'inicial' | 'empresa' | 'industrial';
  estado: 'activa' | 'suspendida';
  creadaEn: string;
  mpPreapprovalId?: string | null;
  mpEstadoSub?: string | null;
  mpMonto?: number | null;
  mpUltimoPago?: string | null;
  esTrial?: boolean;
  trialFin?: string | null;
  trialLecturaFin?: string | null;
  _count: { activos: number; usuarios: number };
  usuarios: { id: string; nombre: string; email: string; telefono: string | null; activo: boolean; ultimoAcceso: string | null }[];
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error en la operación.');
  return data;
}

export async function listarEmpresas(): Promise<EmpresaAdmin[]> {
  return parse(await apiFetch('admin/empresas'));
}

export async function crearEmpresa(payload: {
  nombre: string;
  cuit?: string;
  plan?: string;
  adminNombre?: string;
  adminEmail: string;
  adminPassword: string;
  adminTelefono?: string;
}): Promise<EmpresaAdmin> {
  return parse(await apiFetch('admin/empresas', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }));
}

export async function actualizarEmpresa(
  id: string,
  payload: Partial<{ nombre: string; cuit: string; plan: string; estado: string }>
): Promise<EmpresaAdmin> {
  return parse(await apiFetch(`admin/empresas/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(payload) }));
}

export async function eliminarEmpresa(id: string): Promise<void> {
  await parse(await apiFetch(`admin/empresas/${id}`, { method: 'DELETE' }));
}

export interface ResetPasswordResult {
  ok: boolean;
  canal: 'telegram' | 'email' | 'admin-fallback';
  email: string;
  telegram: boolean;
}

// El super NO elige la pwd del cliente. Reingresa la SUYA para confirmar
// que la accion la hace el dueño de la sesion. El backend invalida la
// pwd del cliente y le manda un link de "crea una nueva" por Telegram
// y email.
export async function resetPassword(id: string, currentPassword: string): Promise<ResetPasswordResult> {
  return parse(
    await apiFetch(`admin/empresas/${id}/reset-password`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ currentPassword }),
    })
  );
}

export async function generarStripeSubscripcion(
  id: string,
  monto: number,
  moneda: 'usd' | 'uyu'
): Promise<{ sessionUrl: string; sessionId: string }> {
  return parse(
    await apiFetch(`admin/empresas/${id}/stripe-suscripcion`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ monto, moneda }),
    })
  );
}

export async function generarStripeLinkPago(
  id: string,
  monto: number,
  moneda: 'usd' | 'uyu',
  descripcion: string
): Promise<{ sessionUrl: string; sessionId: string }> {
  return parse(
    await apiFetch(`admin/empresas/${id}/stripe-link-pago`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ monto, moneda, descripcion }),
    })
  );
}

export async function cancelarSuscripcion(id: string): Promise<void> {
  await parse(await apiFetch(`admin/empresas/${id}/suscripcion`, { method: 'DELETE' }));
}

export async function cancelarMiSuscripcion(): Promise<void> {
  await parse(await apiFetch('empresas/mi-suscripcion', { method: 'DELETE' }));
}

export interface SolicitudUpgrade {
  id: string;
  nombre: string;
  plan: string;
  planSolicitado: string;
  adminEmail?: string | null;
}

export async function solicitarUpgrade(plan: string): Promise<void> {
  await parse(await apiFetch('suscripcion/solicitar-upgrade', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ plan }) }));
}

export interface PlanComercial {
  plan: string;
  nombre: string;
  precioArs: number | null;
  precioReferenciaUsd: number;
  activosIncluidos: number;
  recargoPorBloqueUsd: number | null;
  tamanoBloqueExtra: number | null;
}

export async function getPlanesComerciales(): Promise<{
  mercadoPagoConfigurado: boolean;
  planes: PlanComercial[];
}> {
  return parse(await apiFetch('suscripcion/planes'));
}

export async function iniciarSuscripcion(plan: string): Promise<{ initPoint: string }> {
  return parse(await apiFetch('suscripcion/iniciar', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ plan }),
  }));
}

export async function getSolicitudesUpgrade(): Promise<SolicitudUpgrade[]> {
  return parse(await apiFetch('admin/solicitudes-upgrade'));
}

export async function descartarSolicitud(empresaId: string): Promise<void> {
  await parse(await apiFetch(`admin/solicitudes-upgrade/${empresaId}`, { method: 'DELETE' }));
}

export interface Estadisticas {
  landingHoy: number;
  landingSemana: number;
  landingTotal: number;
  fichasHoy: number;
  fichasSemana: number;
  fichasTotal: number;
  topFichas: { activoId: string; nombre: string; codigo: string; empresa: string; visitas: number }[];
  topCiudades: { ciudad: string; pais: string; visitas: number }[];
  dispositivos: { mobile: number; tablet: number; desktop: number };
  topSecciones: { seccion: string; visitas: number }[];
  trials: { total: number; activos: number; lectura: number; vencidos: number };
}

export async function getEstadisticas(): Promise<Estadisticas> {
  return parse(await apiFetch('admin/estadisticas'));
}

export async function reiniciarEstadisticas(): Promise<void> {
  await apiFetch('admin/estadisticas', { method: 'DELETE' });
}

export interface PagoMP {
  id: string;
  empresaId: string;
  mpPagoId: string | null;
  monto: number;
  moneda: string;
  estado: string;
  concepto: string | null;
  fecha: string;
  empresa: { id: string; nombre: string; plan: string };
}

export interface Facturacion {
  mrr: number;
  mrrAnterior: number;
  totalAcumulado: number;
  pagosEsteMes: number;
  porMes: { mes: string; total: number; cantidad: number }[];
  porEmpresa: { empresa: { id: string; nombre: string; plan: string }; total: number; cantidad: number }[];
  ultimos: PagoMP[];
}

export async function getFacturacion(): Promise<Facturacion> {
  return parse(await apiFetch('admin/facturacion'));
}

export async function generarSuscripcion(
  id: string,
  monto: number,
  payerEmailOverride?: string
): Promise<{ initPoint: string; preapprovalId: string }> {
  return parse(
    await apiFetch(`admin/empresas/${id}/suscripcion`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ monto, payerEmailOverride }),
    })
  );
}
