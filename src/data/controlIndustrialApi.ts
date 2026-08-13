import { apiFetch } from './auth';

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'No se pudo completar la operación.');
  return data as T;
}

export type EstadoModuloControl = 'configuracion' | 'activo' | 'suspendido';
export type ProveedorIoT = 'sonoff_ewelink' | 'tuya_cloud' | 'milesight_ug65' | 'webhook_generico';

export interface ModuloControl {
  id: string;
  empresaId: string;
  estado: EstadoModuloControl;
  nombreServicio: string;
  cargoImplementacionUsd: number | null;
  abonoMensualUsd: number | null;
  monedaFacturacion: string;
  limiteDispositivos: number;
  limiteGateways: number;
  retencionDias: number;
  umbralSinConexionMinutos: number;
  controlRemotoHabilitado: boolean;
  tableroConfig?: {
    subtitulo?: string;
    refreshSeconds?: number;
    mostrarBateria?: boolean;
    mostrarSenal?: boolean;
  } | null;
  notasComerciales?: string | null;
  habilitadoEn: string;
}

export interface IntegracionIoT {
  id: string;
  nombre: string;
  proveedor: ProveedorIoT;
  estado: string;
  configuracion?: Record<string, unknown> | null;
  webhookTokenHint?: string | null;
  ultimoEventoEn?: string | null;
  ultimoError?: string | null;
  credencialesConfiguradas: boolean;
  capacidades?: { monitoreo: boolean; descubrimiento: boolean; control: boolean; escenas: boolean };
}

export interface VariableIoT {
  id: string;
  clave: string;
  nombre: string;
  uso: 'carga' | 'lampara' | 'motor' | 'ventilador' | 'bomba' | 'calefaccion' | 'toma' | 'otro';
  tipo: 'numero' | 'booleano' | 'texto';
  unidad?: string | null;
  valorNumero?: number | null;
  valorBooleano?: boolean | null;
  valorTexto?: string | null;
  calidad: string;
  medidaEn?: string | null;
}

export interface DispositivoIoT {
  id: string;
  integracionId: string;
  activoId?: string | null;
  identificadorExterno: string;
  nombre: string;
  modelo?: string | null;
  tipo: string;
  estado: string;
  habilitado: boolean;
  permiteControl: boolean;
  ubicacion?: string | null;
  ultimoContactoEn?: string | null;
  bateria?: number | null;
  rssi?: number | null;
  variables: VariableIoT[];
  integracion?: { proveedor: ProveedorIoT };
}

export interface AlarmaIoT {
  id: string;
  titulo: string;
  detalle?: string | null;
  severidad: string;
  estado: string;
  valorDisparador?: string | null;
  iniciadaEn: string;
  dispositivo: { nombre: string };
  variable?: { nombre: string; unidad?: string | null } | null;
}

export interface ComandoIoT {
  id: string;
  tipo: string;
  estado: string;
  motivo: string;
  solicitadoEn: string;
  resultado?: string | null;
  dispositivo: { nombre: string };
}

export interface ReglaAlarmaIoT {
  id: string;
  nombre: string;
  operador: string;
  umbralNumero?: number | null;
  umbralBooleano?: boolean | null;
  umbralTexto?: string | null;
  demoraSegundos: number;
  severidad: string;
  activa: boolean;
  notificarPush: boolean;
  variable: VariableIoT & { dispositivo: { nombre: string } };
}

export interface AccionEscenaIoT {
  dispositivoId: string;
  canal: number;
  encendido: boolean;
}

export interface EscenaIoT {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activa: boolean;
  acciones: AccionEscenaIoT[];
  ultimaEjecucionEn?: string | null;
  ultimaEjecucionEstado?: string | null;
}

export interface ResumenControl {
  modulo: ModuloControl;
  integraciones: IntegracionIoT[];
  dispositivos: DispositivoIoT[];
  alarmas: AlarmaIoT[];
  comandos: ComandoIoT[];
  reglas: ReglaAlarmaIoT[];
  escenas: EscenaIoT[];
}

export interface ResumenEnergia {
  currentPowerW: number;
  currentAverageW: number;
  previousAverageW: number;
  variationPercent: number | null;
  estimatedKwh24h: number;
  previousEstimatedKwh24h: number;
  channelsMeasured: number;
}

export interface EmpresaControlAdmin {
  id: string;
  nombre: string;
  plan: string;
  estado: string;
  moduloControl: ModuloControl | null;
  _count: { dispositivosIoT: number; integracionesIoT: number; alarmasIoT: number };
}

export async function estadoControl(): Promise<{ habilitado: boolean; modulo: ModuloControl | null }> {
  return parse(await apiFetch('control-industrial/estado'));
}

export async function resumenControl(): Promise<ResumenControl> {
  return parse(await apiFetch('control-industrial/resumen'));
}

export async function resumenEnergia(): Promise<ResumenEnergia> {
  return parse(await apiFetch('control-industrial/energia/resumen'));
}

export async function listarControlAdmin(): Promise<EmpresaControlAdmin[]> {
  return parse(await apiFetch('admin/control-industrial'));
}

export async function configurarControlAdmin(empresaId: string, data: Partial<ModuloControl>): Promise<ModuloControl> {
  return parse(await apiFetch(`admin/control-industrial/${empresaId}`, { method: 'PUT', body: JSON.stringify(data) }));
}

export async function crearIntegracion(data: { nombre: string; proveedor: ProveedorIoT }): Promise<IntegracionIoT> {
  return parse(await apiFetch('control-industrial/integraciones', { method: 'POST', body: JSON.stringify(data) }));
}

export async function guardarCredenciales(integracionId: string, credenciales: Record<string, string>): Promise<IntegracionIoT> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/credenciales`, { method: 'PUT', body: JSON.stringify({ credenciales }) }));
}

export async function autorizarSonoff(integracionId: string, data: { appId: string; appSecret: string; pollingSeconds: number }): Promise<{ authUrl: string; redirectUrl: string }> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/autorizar-sonoff`, { method: 'POST', body: JSON.stringify(data) }));
}

export async function generarTokenWebhook(integracionId: string): Promise<{ token: string; endpoint: string; advertencia: string }> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/webhook-token`, { method: 'POST' }));
}

export async function sincronizarSonoff(integracionId: string): Promise<{ ok: boolean; dispositivosImportados: number; totalInformado: number }> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/sincronizar-sonoff`, { method: 'POST' }));
}

export async function configurarTuya(integracionId: string, data: { clientId: string; clientSecret: string; userId: string; region: string; pollingSeconds: number }): Promise<{ ok: boolean; dispositivosImportados: number; totalInformado: number }> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/configurar-tuya`, { method: 'PUT', body: JSON.stringify(data) }));
}

export async function sincronizarTuya(integracionId: string): Promise<{ ok: boolean; dispositivosImportados: number; totalInformado: number }> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}/sincronizar-tuya`, { method: 'POST' }));
}

export async function actualizarIntegracion(integracionId: string, data: Record<string, unknown>): Promise<IntegracionIoT> {
  return parse(await apiFetch(`control-industrial/integraciones/${integracionId}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

export async function actualizarDispositivo(dispositivoId: string, data: Record<string, unknown>): Promise<DispositivoIoT> {
  return parse(await apiFetch(`control-industrial/dispositivos/${dispositivoId}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

export async function actualizarVariable(variableId: string, data: { nombre?: string; uso?: VariableIoT['uso'] }): Promise<VariableIoT> {
  return parse(await apiFetch(`control-industrial/variables/${variableId}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

async function descargarHistorial(path: string): Promise<{ blob: Blob; filename: string; truncated: boolean }> {
  const response = await apiFetch(path);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'No se pudo exportar el historial.');
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'historial-activaqr.csv';
  return { blob: await response.blob(), filename, truncated: response.headers.get('X-ActivaQR-Truncated') === 'true' };
}

export function exportarHistorialDispositivo(dispositivoId: string, horas = 24) {
  return descargarHistorial(`control-industrial/dispositivos/${dispositivoId}/historial.csv?horas=${horas}`);
}

export function exportarHistorialVariable(variableId: string, horas = 24) {
  return descargarHistorial(`control-industrial/variables/${variableId}/historial.csv?horas=${horas}`);
}

export async function reconocerAlarma(id: string): Promise<void> {
  await parse(await apiFetch(`control-industrial/alarmas/${id}/reconocer`, { method: 'POST' }));
}

export async function crearRegla(data: { variableId: string; nombre: string; operador: string; umbral: string | number | boolean; demoraSegundos: number; severidad: string; notificarPush: boolean }): Promise<void> {
  await parse(await apiFetch('control-industrial/reglas', { method: 'POST', body: JSON.stringify(data) }));
}

export async function actualizarRegla(id: string, data: Record<string, unknown>): Promise<void> {
  await parse(await apiFetch(`control-industrial/reglas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

export async function eliminarRegla(id: string): Promise<void> {
  const response = await apiFetch(`control-industrial/reglas/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'No se pudo eliminar la regla.');
}

export async function probarNotificacionControl(): Promise<{ ok: boolean; suscripciones: number }> {
  return parse(await apiFetch('control-industrial/notificaciones/prueba', { method: 'POST' }));
}

export async function crearEscena(data: { nombre: string; descripcion?: string; acciones: AccionEscenaIoT[] }): Promise<EscenaIoT> {
  return parse(await apiFetch('control-industrial/escenas', { method: 'POST', body: JSON.stringify(data) }));
}

export async function actualizarEscena(id: string, data: Record<string, unknown>): Promise<EscenaIoT> {
  return parse(await apiFetch(`control-industrial/escenas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }));
}

export async function eliminarEscena(id: string): Promise<void> {
  const response = await apiFetch(`control-industrial/escenas/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error((await response.json().catch(() => ({})))?.error || 'No se pudo eliminar la escena.');
}

export async function ejecutarEscena(id: string): Promise<{ ok: boolean; accionesEjecutadas: number }> {
  return parse(await apiFetch(`control-industrial/escenas/${id}/ejecutar`, { method: 'POST' }));
}

export async function historialVariable(id: string, horas = 24): Promise<{ variable: VariableIoT; lecturas: Array<{ id: string; valorNumero?: number | null; valorBooleano?: boolean | null; valorTexto?: string | null; medidaEn: string }> }> {
  return parse(await apiFetch(`control-industrial/variables/${id}/historial?horas=${horas}`));
}

export async function solicitarComando(data: { dispositivoId: string; tipo: string; payload: Record<string, unknown>; motivo: string }): Promise<ComandoIoT> {
  return parse(await apiFetch('control-industrial/comandos', { method: 'POST', body: JSON.stringify(data) }));
}
