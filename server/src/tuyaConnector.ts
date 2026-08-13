import { createHash, createHmac } from 'crypto';
import { prisma } from './prisma';
import { cifrarCredenciales, descifrarCredenciales } from './iotSecrets';
import { normalizarEventoIoT, procesarEventoIoT } from './iotIngest';

const DOMAINS: Record<string, string> = {
  us: 'https://openapi.tuyaus.com',
  eu: 'https://openapi.tuyaeu.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};
const syncing = new Set<string>();

type TuyaCredentials = {
  clientId: string;
  clientSecret: string;
  userId: string;
  region: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
};

type TuyaResponse<T> = { success: boolean; result?: T; msg?: string; code?: number };
type TuyaStatus = { code: string; value: unknown };
type TuyaDevice = { id: string; name?: string; category?: string; product_name?: string; online?: boolean; status?: TuyaStatus[] };

function credentialsOf(value: Record<string, unknown>): TuyaCredentials {
  return {
    clientId: String(value.clientId ?? ''), clientSecret: String(value.clientSecret ?? ''),
    userId: String(value.userId ?? ''), region: String(value.region ?? 'us'),
    accessToken: value.accessToken ? String(value.accessToken) : undefined,
    refreshToken: value.refreshToken ? String(value.refreshToken) : undefined,
    tokenExpiresAt: value.tokenExpiresAt ? Number(value.tokenExpiresAt) : undefined,
  };
}

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function signature(secret: string, value: string) { return createHmac('sha256', secret).update(value).digest('hex').toUpperCase(); }

async function rawRequest<T>(credentials: TuyaCredentials, method: string, path: string, body?: unknown, withToken = true): Promise<T> {
  const domain = DOMAINS[credentials.region];
  if (!domain) throw Object.assign(new Error('Región Tuya inválida.'), { status: 400 });
  const timestamp = String(Date.now());
  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const stringToSign = `${method}\n${sha256(rawBody)}\n\n${path}`;
  const signValue = `${credentials.clientId}${withToken ? credentials.accessToken ?? '' : ''}${timestamp}${stringToSign}`;
  const response = await fetch(`${domain}${path}`, {
    method,
    headers: {
      client_id: credentials.clientId,
      sign: signature(credentials.clientSecret, signValue),
      t: timestamp,
      sign_method: 'HMAC-SHA256',
      ...(withToken && credentials.accessToken ? { access_token: credentials.accessToken } : {}),
      'Content-Type': 'application/json',
    },
    ...(rawBody ? { body: rawBody } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as TuyaResponse<T>;
  if (!response.ok || !result.success) throw Object.assign(new Error(`Tuya respondió ${response.status}: ${result.msg || `error ${result.code ?? 'desconocido'}`}`), { status: response.status === 401 ? 401 : 502 });
  return result.result as T;
}

async function authorized(integration: { id: string; credencialesCifradas: string | null }) {
  if (!integration.credencialesCifradas) throw Object.assign(new Error('Primero configurá las credenciales de Tuya Cloud.'), { status: 409 });
  let credentials = credentialsOf(descifrarCredenciales(integration.credencialesCifradas));
  if (!credentials.clientId || !credentials.clientSecret || !credentials.userId || !DOMAINS[credentials.region]) throw Object.assign(new Error('Las credenciales de Tuya Cloud están incompletas.'), { status: 400 });
  if (!credentials.accessToken || !credentials.tokenExpiresAt || credentials.tokenExpiresAt < Date.now() + 60_000) {
    const token = await rawRequest<{ access_token: string; refresh_token: string; expire_time: number }>(credentials, 'GET', '/v1.0/token?grant_type=1', undefined, false);
    credentials = { ...credentials, accessToken: token.access_token, refreshToken: token.refresh_token, tokenExpiresAt: Date.now() + Math.max(60, Number(token.expire_time) || 7200) * 1000 };
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { credencialesCifradas: cifrarCredenciales(credentials), estado: 'configurada', ultimoError: null } });
  }
  return credentials;
}

export function escalarValorTuya(value: unknown, spec?: { values?: string; unit?: string }) {
  if (typeof value !== 'number') return value;
  let scale = 0;
  try { scale = Number(JSON.parse(spec?.values ?? '{}')?.scale) || 0; } catch { scale = 0; }
  const scaled = value / (10 ** scale);
  if (spec?.unit === 'mA') return scaled / 1000;
  return scaled;
}

export function normalizarCodigoTuya(code: string) {
  const key = code.toLowerCase();
  if (key === 'switch') return 'relay';
  if (/^switch_\d+$/.test(key)) return key;
  if (['temp_current', 'temp_value', 'current_temperature', 'temperature'].includes(key)) return 'temperature';
  if (['humidity_value', 'humidity_current', 'current_humidity', 'humidity'].includes(key)) return 'humidity';
  if (['doorcontact_state', 'door_state', 'door'].includes(key)) return 'door';
  if (['watersensor_state', 'water_leak', 'water'].includes(key)) return 'water';
  if (['pir', 'pir_state', 'motion_state'].includes(key)) return 'motion';
  if (key === 'cur_current') return 'current';
  if (key === 'cur_voltage') return 'voltage';
  if (key === 'cur_power') return 'actpow';
  if (key === 'add_ele') return 'energy';
  if (['battery_percentage', 'battery_state'].includes(key)) return 'battery';
  return key;
}

function classify(device: TuyaDevice, readings: Record<string, unknown>) {
  const identity = `${device.category ?? ''} ${device.product_name ?? ''} ${device.name ?? ''}`.toLowerCase();
  if (Object.keys(readings).some((key) => /^switch_\d+$|^relay$/.test(key))) return Object.keys(readings).filter((key) => /^switch_\d+$/.test(key)).length > 1 ? 'interruptor_multicanal' : 'interruptor';
  if (/water|leak|flood|inund/.test(identity) || 'water' in readings) return 'sensor_inundacion';
  if (/door|window|contact|magnet|puerta/.test(identity) || 'door' in readings) return 'sensor_magnetico';
  if (/temp|humidity|thermo|hygro/.test(identity) || 'temperature' in readings || 'humidity' in readings) return 'sensor_ambiente';
  if (/pir|motion|movement/.test(identity) || 'motion' in readings) return 'sensor_movimiento';
  return 'sensor';
}

export async function sincronizarTuya(integracionId: string) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'tuya_cloud') throw Object.assign(new Error('Conector Tuya no encontrado.'), { status: 404 });
  const credentials = await authorized(integration);
  try {
    const devices = await rawRequest<TuyaDevice[]>(credentials, 'GET', `/v1.0/users/${encodeURIComponent(credentials.userId)}/devices`);
    const archivedIds = new Set((await prisma.dispositivoIoT.findMany({
      where: { integracionId: integration.id, archivadoEn: { not: null } },
      select: { identificadorExterno: true },
    })).map((device) => device.identificadorExterno));
    let imported = 0;
    for (const device of devices ?? []) {
      if (archivedIds.has(device.id)) continue;
      const [status, specs] = await Promise.all([
        rawRequest<TuyaStatus[]>(credentials, 'GET', `/v1.0/devices/${encodeURIComponent(device.id)}/status`).catch(() => device.status ?? []),
        rawRequest<{ status?: Array<{ code: string; values?: string; unit?: string }> }>(credentials, 'GET', `/v1.0/devices/${encodeURIComponent(device.id)}/specifications`).catch(() => ({ status: [] })),
      ]);
      const specByCode = Object.fromEntries((specs.status ?? []).map((item) => [item.code, item]));
      const readings: Record<string, number | boolean | string> = {};
      for (const item of status ?? []) {
        const value = escalarValorTuya(item.value, specByCode[item.code]);
        if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') readings[normalizarCodigoTuya(item.code)] = value;
      }
      readings.online = device.online !== false;
      await procesarEventoIoT(integration.id, normalizarEventoIoT({ deviceId: device.id, deviceName: device.name, model: device.product_name, deviceType: classify(device, readings), readings, timestamp: new Date().toISOString() }));
      imported += 1;
    }
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'conectada', ultimoEventoEn: new Date(), ultimoError: null } });
    return { ok: true, dispositivosImportados: imported, totalInformado: devices?.length ?? 0 };
  } catch (error) {
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: error instanceof Error ? error.message.slice(0, 2000) : 'Error Tuya Cloud' } });
    throw error;
  }
}

export async function ejecutarCanalTuya(integracionId: string, dispositivoExternoId: string, codigo: string, encendido: boolean) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'tuya_cloud') throw Object.assign(new Error('Conector Tuya no encontrado.'), { status: 404 });
  const credentials = await authorized(integration);
  await rawRequest(credentials, 'POST', `/v1.0/devices/${encodeURIComponent(dispositivoExternoId)}/commands`, { commands: [{ code: codigo, value: encendido }] });
  return { ok: true, codigo, encendido };
}

async function scheduled() {
  const integrations = await prisma.integracionIoT.findMany({ where: { proveedor: 'tuya_cloud', estado: { in: ['configurada', 'conectada'] }, credencialesCifradas: { not: null }, empresa: { moduloControl: { estado: 'activo' } } }, take: 100 });
  for (const integration of integrations) {
    if (syncing.has(integration.id)) continue;
    const config = integration.configuracion && typeof integration.configuracion === 'object' && !Array.isArray(integration.configuracion) ? integration.configuracion as Record<string, unknown> : {};
    const seconds = Math.min(3600, Math.max(10, Number(config.pollingSeconds) || 30));
    if (integration.ultimoEventoEn && Date.now() - integration.ultimoEventoEn.getTime() < seconds * 1000) continue;
    syncing.add(integration.id);
    try { await sincronizarTuya(integration.id); } catch (error) { console.error('[tuya] sincronización:', integration.id, error instanceof Error ? error.message : error); } finally { syncing.delete(integration.id); }
  }
}

export function iniciarSincronizadorTuya() {
  const timer = setInterval(() => scheduled().catch((error) => console.error('[tuya] programador:', error)), 2_000);
  timer.unref();
}
