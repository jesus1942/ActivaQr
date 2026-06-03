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

export async function resetPassword(id: string, password: string): Promise<void> {
  await parse(
    await apiFetch(`admin/empresas/${id}/reset-password`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
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
}

export async function getEstadisticas(): Promise<Estadisticas> {
  return parse(await apiFetch('admin/estadisticas'));
}

export async function reiniciarEstadisticas(): Promise<void> {
  await apiFetch('admin/estadisticas', { method: 'DELETE' });
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
