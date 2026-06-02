import { apiFetch } from './auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Error en la operación.');
  return data;
}

export interface Kpis {
  resumen: {
    totalActivos: number;
    porEstado: Record<string, number>;
    operativos: number;
    disponibilidad: number;
    tareasPendientes: number;
    tareasVencidas: number;
    tareasCompletadas: number;
    cumplimiento: number;
    mttrDias: number | null;
    mtbfDias: number | null;
  };
  equiposConMasFallas: { activoId: string; codigo: string; nombre: string; fallas: number }[];
  alertasPorSector: { sector: string; total: number; criticos: number }[];
  tendenciaFallas: { mes: string; fallas: number }[];
  predictivo: { activoId: string; codigo: string; nombre: string; parametro: string; tendencia: string }[];
}

export async function getKpis(): Promise<Kpis> {
  return parse(await apiFetch('kpis'));
}

export interface RegistroAuditoria {
  id: string;
  usuarioNombre: string;
  usuarioRol: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string | null;
  creadoEn: string;
}

export async function getAuditoria(filtros?: { entidad?: string; accion?: string }): Promise<RegistroAuditoria[]> {
  const qs = new URLSearchParams();
  if (filtros?.entidad) qs.set('entidad', filtros.entidad);
  if (filtros?.accion) qs.set('accion', filtros.accion);
  const q = qs.toString();
  return parse(await apiFetch(`auditoria${q ? `?${q}` : ''}`));
}

export interface Documento {
  id: string;
  activoId: string;
  nombre: string;
  tipo: string;
  url: string;
  creadoEn: string;
}

export async function getDocumentos(activoId: string): Promise<Documento[]> {
  return parse(await apiFetch(`documentos?activoId=${encodeURIComponent(activoId)}`));
}

export async function crearDocumento(payload: { activoId: string; nombre: string; tipo: string; url: string }): Promise<Documento> {
  return parse(await apiFetch('documentos', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }));
}

export async function eliminarDocumento(id: string): Promise<void> {
  await parse(await apiFetch(`documentos/${id}`, { method: 'DELETE' }));
}
