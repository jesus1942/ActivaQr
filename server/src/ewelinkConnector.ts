import { createHmac, randomBytes } from 'crypto';
import WebSocket from 'ws';
import { prisma } from './prisma';
import { cifrarCredenciales, descifrarCredenciales, firmarEstadoOAuth } from './iotSecrets';
import { normalizarEventoIoT, procesarEventoIoT } from './iotIngest';

const DOMAINS: Record<string, string> = {
  cn: 'https://cn-apia.coolkit.cn',
  as: 'https://as-apia.coolkit.cc',
  us: 'https://us-apia.coolkit.cc',
  eu: 'https://eu-apia.coolkit.cc',
};
const DISPATCH_DOMAINS: Record<string, string> = {
  cn: 'https://cn-dispa.coolkit.cn',
  as: 'https://as-dispa.coolkit.cc',
  us: 'https://us-dispa.coolkit.cc',
  eu: 'https://eu-dispa.coolkit.cc',
};
const syncing = new Set<string>();
const freshStatusCursor = new Map<string, number>();
const FRESH_STATUS_LIMIT = 1;
const REALTIME_MAX_PAYLOAD_BYTES = 256 * 1024;
let statusRequestQueue: Promise<void> = Promise.resolve();
let lastStatusRequestAt = 0;
type RealtimeConnection = { socket: WebSocket; heartbeat?: NodeJS.Timeout; authenticated: boolean };
const realtimeConnections = new Map<string, RealtimeConnection>();
export const EWELINK_REDIRECT_URL = process.env.EWELINK_REDIRECT_URL?.trim()
  || 'https://api.activaqr.net/api/iot/ewelink/oauth/callback';

type EwelinkCredentials = {
  appId: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  atExpiredTime?: number;
  rtExpiredTime?: number;
  userApiKey?: string;
  region?: string;
  redirectUrl?: string;
};

export function mensajePublicoErrorEwelink(message: unknown): string | null {
  const text = String(message ?? '').trim();
  if (!text) return null;
  if (/invoke too much|too many|rate limit|límite de consultas/i.test(text)) {
    return 'eWeLink alcanzó temporalmente el límite de consultas. La conexión se reintentará automáticamente.';
  }
  if (/access token|autorizaci[oó]n|authorization|unauthorized|credenciales/i.test(text)) {
    return 'eWeLink rechazó la autorización. Volvé a conectar la cuenta.';
  }
  if (/offline|fuera de l[ií]nea|desconectad/i.test(text)) {
    return 'eWeLink informó que el dispositivo está fuera de línea.';
  }
  if (/timeout|timed out|no respondi[oó]/i.test(text)) {
    return 'eWeLink no respondió dentro del tiempo esperado.';
  }
  if (/no se pudo conectar|connection|network/i.test(text)) {
    return 'No se pudo conectar con la nube eWeLink.';
  }
  return 'eWeLink informó un error de integración. Reintentá la sincronización o reconectá la cuenta.';
}

function expirationMs(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function nonce() {
  return randomBytes(6).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).padEnd(8, '0');
}

function sign(appSecret: string, value: string) {
  return createHmac('sha256', appSecret).update(value, 'utf8').digest('base64');
}

function credentialsOf(payload: Record<string, unknown>): EwelinkCredentials {
  return {
    appId: String(payload.appId ?? ''),
    appSecret: String(payload.appSecret ?? ''),
    accessToken: payload.accessToken ? String(payload.accessToken) : undefined,
    refreshToken: payload.refreshToken ? String(payload.refreshToken) : undefined,
    atExpiredTime: expirationMs(payload.atExpiredTime),
    rtExpiredTime: expirationMs(payload.rtExpiredTime),
    userApiKey: payload.userApiKey ? String(payload.userApiKey) : undefined,
    region: payload.region ? String(payload.region) : undefined,
    redirectUrl: payload.redirectUrl ? String(payload.redirectUrl) : undefined,
  };
}

async function postSigned<T>(domain: string, path: string, credentials: EwelinkCredentials, body: Record<string, unknown>): Promise<T> {
  const rawBody = JSON.stringify(body);
  const response = await fetch(`${domain}${path}`, {
    method: 'POST',
    headers: {
      'X-CK-Appid': credentials.appId,
      'X-CK-Nonce': nonce(),
      Authorization: `Sign ${sign(credentials.appSecret, rawBody)}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: rawBody,
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({})) as { error?: number; msg?: string; data?: T };
  if (!response.ok || result.error) {
    const message = mensajePublicoErrorEwelink(result.msg)
      || `eWeLink rechazó la solicitud (código ${result.error ?? response.status}).`;
    throw Object.assign(new Error(message), { status: 502 });
  }
  if (!result.data) throw Object.assign(new Error('eWeLink no devolvió las credenciales esperadas.'), { status: 502 });
  return result.data;
}

export function crearAutorizacionEwelink(params: { integrationId: string; empresaId: string; userId: string; appId: string; appSecret: string }) {
  const seq = String(Date.now());
  const state = firmarEstadoOAuth({ integrationId: params.integrationId, empresaId: params.empresaId, userId: params.userId, exp: Date.now() + 15 * 60_000 });
  const query = new URLSearchParams({
    state,
    clientId: params.appId,
    authorization: sign(params.appSecret, `${params.appId}_${seq}`),
    seq,
    redirectUrl: EWELINK_REDIRECT_URL,
    nonce: nonce(),
    grantType: 'authorization_code',
    showQRCode: 'true',
  });
  return { authUrl: `https://c2ccdn.coolkit.cc/oauth/index.html?${query}`, redirectUrl: EWELINK_REDIRECT_URL };
}

export async function completarAutorizacionEwelink(integrationId: string, code: string, region: string) {
  if (!DOMAINS[region]) throw Object.assign(new Error('eWeLink devolvió una región desconocida.'), { status: 400 });
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integrationId } });
  if (!integration?.credencialesCifradas || integration.proveedor !== 'sonoff_ewelink') throw Object.assign(new Error('Conector SONOFF no encontrado.'), { status: 404 });
  const current = credentialsOf(descifrarCredenciales(integration.credencialesCifradas));
  if (!current.appId || !current.appSecret) throw Object.assign(new Error('Faltan APPID o APP SECRET para completar la autorización.'), { status: 409 });
  const token = await postSigned<{ accessToken: string; refreshToken: string; atExpiredTime: number; rtExpiredTime: number }>(
    DOMAINS[region], '/v2/user/oauth/token', current,
    { code, redirectUrl: EWELINK_REDIRECT_URL, grantType: 'authorization_code' },
  );
  await prisma.integracionIoT.update({
    where: { id: integration.id },
    data: {
      credencialesCifradas: cifrarCredenciales({ ...current, ...token, region, redirectUrl: EWELINK_REDIRECT_URL }),
      configuracion: { ...((integration.configuracion as object) || {}), oauthAutorizado: true },
      estado: 'configurada',
      ultimoError: null,
    },
  });
  try {
    return await sincronizarEwelink(integration.id);
  } catch (error) {
    // La autorización ya fue concedida. Una caída momentánea de la API de
    // dispositivos no debe obligar al usuario a repetir OAuth: el programador
    // retoma la primera sincronización con backoff.
    console.warn('[ewelink] autorización completa; sincronización pendiente:', integration.id, error instanceof Error ? error.message : error);
    return { ok: true, dispositivosImportados: 0, totalInformado: 0, sincronizacionPendiente: true };
  }
}

async function renovarTokenEwelink(integrationId: string, credentials: EwelinkCredentials): Promise<EwelinkCredentials> {
  const region = credentials.region ?? 'us';
  if (!DOMAINS[region] || !credentials.refreshToken) throw Object.assign(new Error('La autorización eWeLink venció. Volvé a conectar la cuenta.'), { status: 401 });
  const token = await postSigned<{ at: string; rt: string; user?: { apikey?: string } }>(DOMAINS[region], '/v2/user/refresh', credentials, { rt: credentials.refreshToken });
  const renewed: EwelinkCredentials = {
    ...credentials,
    accessToken: token.at,
    refreshToken: token.rt,
    userApiKey: token.user?.apikey || credentials.userApiKey,
    atExpiredTime: Date.now() + 30 * 24 * 60 * 60_000,
    rtExpiredTime: Date.now() + 60 * 24 * 60 * 60_000,
  };
  await prisma.integracionIoT.update({ where: { id: integrationId }, data: { credencialesCifradas: cifrarCredenciales(renewed) } });
  return renewed;
}

export function extraerLecturasEwelink(value: unknown): Record<string, number | boolean | string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number | boolean | string> = {};
  const params = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(params)) {
    if (typeof item === 'number' || typeof item === 'boolean') result[key] = item;
    else if (typeof item === 'string') {
      const numeric = Number(item);
      const normalized = item.trim().toLowerCase();
      const active = new Set(['on', 'open', 'opened', 'detected', 'alarm', 'wet', 'leak', 'motion']);
      const inactive = new Set(['off', 'close', 'closed', 'normal', 'dry', 'no_leak', 'clear', 'no_motion']);
      result[key] = item.trim() !== '' && Number.isFinite(numeric) ? numeric : active.has(normalized) ? true : inactive.has(normalized) ? false : item;
    } else if (Array.isArray(item) && /^(current|voltage|actpow|apparentpow|reactpow|reactivepow|power|factor|daykwh|monthkwh|energy)/i.test(key)) {
      item.forEach((entry, index) => {
        if (typeof entry === 'number' || typeof entry === 'boolean') result[`${key}_${index + 1}`] = entry;
        else if (typeof entry === 'string' && entry.trim() !== '' && Number.isFinite(Number(entry))) result[`${key}_${index + 1}`] = Number(entry);
      });
    }
  }
  if (result.currentTemperature !== undefined) {
    result.temperature = result.currentTemperature;
    delete result.currentTemperature;
  }
  if (result.currentHumidity !== undefined) {
    result.humidity = result.currentHumidity;
    delete result.currentHumidity;
  }
  if (result.switch !== undefined) {
    result.relay = result.switch;
    delete result.switch;
  }
  if (Array.isArray(params.switches)) {
    for (const item of params.switches) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const channel = Number((item as Record<string, unknown>).outlet);
      const state = (item as Record<string, unknown>).switch;
      if (Number.isInteger(channel) && channel >= 0 && channel <= 3 && (state === 'on' || state === 'off')) {
        result[`switch_${channel + 1}`] = state === 'on';
      }
    }
  }
  if (Array.isArray(params.timers)) {
    result.active_timers = params.timers.filter((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      const enabled = (item as Record<string, unknown>).enabled;
      return enabled !== false && enabled !== 0 && enabled !== 'off' && enabled !== 'disable';
    }).length;
  }
  const pulseConfig = params.pulseConfig && typeof params.pulseConfig === 'object' && !Array.isArray(params.pulseConfig)
    ? params.pulseConfig as Record<string, unknown>
    : {};
  if (params.pulse !== undefined || pulseConfig.pulse !== undefined) {
    const pulse = params.pulse ?? pulseConfig.pulse;
    result.pulse_enabled = pulse === true || pulse === 1 || pulse === 'on' || pulse === 'enable';
  }
  const pulseWidth = params.pulseWidth ?? pulseConfig.pulseWidth;
  if (pulseWidth !== undefined && Number.isFinite(Number(pulseWidth))) {
    result.pulse_duration_ms = Number(pulseWidth);
  }
  if (Array.isArray(params.pulses)) {
    for (const item of params.pulses) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const entry = item as Record<string, unknown>;
      const outlet = Number(entry.outlet);
      if (!Number.isInteger(outlet) || outlet < 0 || outlet > 3) continue;
      result[`pulse_enabled_${outlet + 1}`] = entry.pulse === true || entry.pulse === 1 || entry.pulse === 'on' || entry.pulse === 'enable';
      if (Number.isFinite(Number(entry.width))) result[`pulse_duration_ms_${outlet + 1}`] = Number(entry.width);
    }
  }
  if (params.workMode !== undefined && Number.isFinite(Number(params.workMode))) {
    result.operation_mode = Number(params.workMode) === 2 ? 'motor' : 'interruptor';
    delete result.workMode;
  }
  if (params.currLocation !== undefined && Number.isFinite(Number(params.currLocation))) {
    result.motor_position = Math.min(100, Math.max(0, Number(params.currLocation)));
    delete result.currLocation;
  }
  if (params.motorTurn !== undefined && [0, 1, 2].includes(Number(params.motorTurn))) {
    result.motor_state = ['detenido', 'abriendo', 'cerrando'][Number(params.motorTurn)];
    delete result.motorTurn;
  }
  return result;
}

export function normalizarOnlineEwelink(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return !['', '0', 'false', 'off', 'offline', 'no'].includes(value.trim().toLowerCase());
  return false;
}

export function combinarEstadoEwelink(device: Record<string, unknown>, freshParams?: Record<string, unknown>): Record<string, unknown> {
  const listedParams = device.params && typeof device.params === 'object' && !Array.isArray(device.params)
    ? device.params as Record<string, unknown>
    : {};
  return { ...device, params: { ...listedParams, ...(freshParams ?? {}) } };
}

export function normalizarMagnitudesEwelink(readings: Record<string, number | boolean | string>, device: Record<string, unknown>) {
  const extra = device.extra && typeof device.extra === 'object' && !Array.isArray(device.extra) ? device.extra as Record<string, unknown> : {};
  const identity = `${device.name ?? ''} ${device.productModel ?? ''} ${extra.model ?? ''}`.toLowerCase();
  const uiid = Number(device.uiid ?? extra.uiid);
  if (uiid !== 126 && !/dual\s*r3|dualr3|e32-2sw/.test(identity)) return readings;
  const scaled = { ...readings };
  for (const [key, value] of Object.entries(scaled)) {
    if (typeof value !== 'number') continue;
    if (/^(current|voltage|actpow|power|apparentpow)(?:_\d+)?$/i.test(key)) {
      scaled[key] = Math.abs(Number.isInteger(value) ? value / 100 : value);
    } else if (/^(reactpow|reactivepow)(?:_\d+)?$/i.test(key) && Number.isInteger(value)) {
      scaled[key] = value / 100;
    }
  }
  return scaled;
}

export function clasificarDispositivoEwelink(device: Record<string, unknown>): string {
  const extra = device.extra && typeof device.extra === 'object' && !Array.isArray(device.extra)
    ? device.extra as Record<string, unknown>
    : {};
  const params = device.params && typeof device.params === 'object' && !Array.isArray(device.params)
    ? device.params as Record<string, unknown>
    : {};
  const uiid = Number(device.uiid ?? extra.uiid);
  const identity = `${device.name ?? ''} ${device.productModel ?? ''} ${extra.model ?? ''}`.toLowerCase();
  if (uiid === 28 || /rf\s*bridge|rfbridge|puente\s*rf|433\s*bridge/.test(identity)) return 'puente_rf';
  if (Array.isArray(params.switches)) {
    const channels = params.switches.filter((item) => item && typeof item === 'object').length;
    if (channels > 1) return 'interruptor_multicanal';
    if (channels === 1) return 'interruptor';
  }
  if ('switch' in params) return 'interruptor';
  if (/water|leak|flood|inund|fuga/.test(identity) || ['water', 'leak', 'flood', 'waterLeak'].some((key) => key in params)) return 'sensor_inundacion';
  if (/door|window|contact|magnet|puerta|ventana|apertura/.test(identity) || ['door', 'window', 'contact', 'open'].some((key) => key in params)) return 'sensor_magnetico';
  if (/temperature|humidity|thermo|hygro|temperatura|humedad|\bth\b/.test(identity) || ['temperature', 'currentTemperature', 'humidity', 'currentHumidity'].some((key) => key in params)) return 'sensor_ambiente';
  if (/motion|pir|movement|movimiento/.test(identity) || ['motion', 'pir', 'movement'].some((key) => key in params)) return 'sensor_movimiento';
  if (/smoke|gas|co2|humo/.test(identity) || ['smoke', 'gas', 'co2'].some((key) => key in params)) return 'sensor_alarma';
  return 'sensor';
}

export function crearParametrosCanalEwelink(canal: number, encendido: boolean) {
  if (!Number.isInteger(canal) || canal < 0 || canal > 3) throw Object.assign(new Error('El canal eWeLink debe estar entre 1 y 4.'), { status: 400 });
  return {
    // eWeLink acepta actualizaciones parciales: enviar únicamente la salida
    // elegida evita pisar el otro canal con un estado almacenado anteriormente.
    switches: [{ outlet: canal, switch: encendido ? 'on' : 'off' }],
  };
}

async function credencialesAutorizadas(integration: { id: string; credencialesCifradas: string | null }, forceRefresh = false) {
  if (!integration.credencialesCifradas) throw Object.assign(new Error('Primero autorizá la cuenta eWeLink.'), { status: 409 });
  let credentials = credentialsOf(descifrarCredenciales(integration.credencialesCifradas));
  if (credentials.rtExpiredTime && credentials.rtExpiredTime <= Date.now()) throw Object.assign(new Error('La autorización eWeLink venció. Volvé a conectar la cuenta.'), { status: 401 });
  if (forceRefresh || (credentials.atExpiredTime && credentials.atExpiredTime < Date.now() + 5 * 60_000)) credentials = await renovarTokenEwelink(integration.id, credentials);
  const region = String(credentials.region ?? 'us');
  if (!credentials.appId || !credentials.accessToken || !DOMAINS[region]) throw Object.assign(new Error('Las credenciales o la región eWeLink no son válidas.'), { status: 400 });
  return { credentials, region, domain: DOMAINS[region] };
}

async function esperarTurnoEstadoEwelink() {
  const current = statusRequestQueue.then(async () => {
    const waitMs = Math.max(0, 550 - (Date.now() - lastStatusRequestAt));
    if (waitMs) await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    lastStatusRequestAt = Date.now();
  });
  statusRequestQueue = current.catch(() => {});
  await current;
}

async function obtenerEstadoEfectivoEwelink(domain: string, credentials: EwelinkCredentials, dispositivoExternoId: string) {
  const query = new URLSearchParams({ type: '1', id: dispositivoExternoId });
  await esperarTurnoEstadoEwelink();
  const response = await fetch(`${domain}/v2/device/thing/status?${query}`, {
    headers: {
      'X-CK-Appid': credentials.appId,
      'X-CK-Nonce': nonce(),
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(8_000),
  });
  const body = await response.json().catch(() => ({})) as { error?: number; msg?: string; data?: { params?: Record<string, unknown> } };
  if (!response.ok || body.error || !body.data?.params) {
    throw new Error(mensajePublicoErrorEwelink(body.msg)
      || `No se pudo obtener el estado eWeLink (código ${body.error ?? response.status}).`);
  }
  return body.data.params;
}

async function getAuthorizedJson<T>(url: string, credentials: EwelinkCredentials): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'X-CK-Appid': credentials.appId,
      'X-CK-Nonce': nonce(),
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({})) as { error?: number; msg?: string; reason?: string; data?: T } & T;
  if (!response.ok || body.error) throw new Error(mensajePublicoErrorEwelink(body.msg || body.reason)
    || `eWeLink rechazó la solicitud (código ${body.error ?? response.status}).`);
  return (body.data ?? body) as T;
}

export async function procesarMensajeTiempoRealEwelink(integracionId: string, message: unknown) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
  const event = message as Record<string, unknown>;
  if (!['update', 'sysmsg'].includes(String(event.action)) || typeof event.deviceid !== 'string') return false;
  const params = event.params && typeof event.params === 'object' && !Array.isArray(event.params)
    ? event.params as Record<string, unknown>
    : {};
  const device = await prisma.dispositivoIoT.findUnique({
    where: { integracionId_identificadorExterno: { integracionId, identificadorExterno: event.deviceid } },
    select: { nombre: true, modelo: true, tipo: true },
  });
  if (!device) return false;
  const readings = normalizarMagnitudesEwelink(extraerLecturasEwelink(params), { productModel: device.modelo });
  if (event.action === 'sysmsg' && 'online' in params) readings.online = normalizarOnlineEwelink(params.online);
  else if (event.action === 'update') readings.online = true;
  if (!Object.keys(readings).length) return false;
  await procesarEventoIoT(integracionId, normalizarEventoIoT({
    deviceId: event.deviceid,
    deviceName: device.nombre,
    model: device.modelo,
    deviceType: device.tipo,
    readings,
    timestamp: new Date().toISOString(),
  }));
  return true;
}

async function asegurarTiempoRealEwelink(integration: { id: string }, credentials: EwelinkCredentials, region: string, domain: string) {
  const current = realtimeConnections.get(integration.id);
  if (current && (current.socket.readyState === WebSocket.OPEN || current.socket.readyState === WebSocket.CONNECTING)) return;
  // Standard Role no incluye el endpoint de perfil. La API oficial recomienda
  // obtener el userApiKey desde la familia autorizada.
  const families = await getAuthorizedJson<{ familyList?: Array<{ apikey?: string }> }>(`${domain}/v2/family?lang=en`, credentials);
  const apikey = credentials.userApiKey || families.familyList?.find((family) => family.apikey)?.apikey;
  if (!apikey) throw new Error('eWeLink no informó la identidad necesaria para sincronización en tiempo real.');
  const dispatch = await getAuthorizedJson<{ domain?: string; port?: number }>(`${DISPATCH_DOMAINS[region]}/dispatch/app`, credentials);
  const host = String(dispatch.domain ?? '').trim().toLowerCase().replace(/\.$/, '');
  const port = Number(dispatch.port);
  if (!host || !/(^|\.)(coolkit\.cc|coolkit\.cn)$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('eWeLink informó un servidor de tiempo real no permitido.');
  }
  const socket = new WebSocket(`wss://${host}:${port}/api/ws`, {
    handshakeTimeout: 10_000,
    maxPayload: REALTIME_MAX_PAYLOAD_BYTES,
    perMessageDeflate: false,
  });
  const connection: RealtimeConnection = { socket, authenticated: false };
  realtimeConnections.set(integration.id, connection);
  let messageQueue = Promise.resolve();
  const close = () => {
    if (connection.heartbeat) clearInterval(connection.heartbeat);
    if (realtimeConnections.get(integration.id)?.socket === socket) realtimeConnections.delete(integration.id);
  };
  socket.on('open', () => socket.send(JSON.stringify({
    action: 'userOnline', version: 8, ts: Math.floor(Date.now() / 1000),
    at: credentials.accessToken, userAgent: 'app', apikey, appid: credentials.appId,
    nonce: nonce(), sequence: String(Date.now()),
  })));
  socket.on('message', (raw) => {
    const text = raw.toString();
    if (Buffer.byteLength(text, 'utf8') > REALTIME_MAX_PAYLOAD_BYTES) {
      socket.close(1009, 'Mensaje demasiado grande');
      return;
    }
    if (text === 'pong') return;
    let message: Record<string, unknown>;
    try { message = JSON.parse(text) as Record<string, unknown>; } catch { return; }
    if (!connection.authenticated && message.error === 0 && message.apikey) {
      connection.authenticated = true;
      const config = message.config && typeof message.config === 'object' && !Array.isArray(message.config) ? message.config as Record<string, unknown> : {};
      const heartbeatSeconds = Math.min(300, Math.max(30, Number(config.hbInterval) || 90)) + 7;
      connection.heartbeat = setInterval(() => socket.readyState === WebSocket.OPEN && socket.send('ping'), heartbeatSeconds * 1000);
      connection.heartbeat.unref();
      console.log('[ewelink] tiempo real conectado:', integration.id);
      return;
    }
    if (!connection.authenticated && typeof message.error === 'number' && message.error !== 0) {
      console.warn('[ewelink] autenticación en tiempo real rechazada:', integration.id, message.error);
      socket.close(1008, 'Autenticación rechazada');
      return;
    }
    if (!connection.authenticated) return;
    messageQueue = messageQueue.then(() => procesarMensajeTiempoRealEwelink(integration.id, message).then(() => undefined)).catch((error) => {
      console.error('[ewelink] evento tiempo real:', integration.id, error instanceof Error ? error.message : error);
    });
  });
  socket.on('close', close);
  socket.on('error', (error) => console.warn('[ewelink] tiempo real:', integration.id, error.message));
}

function requiereEstadoEfectivoEwelink(device: Record<string, unknown>) {
  const params = device.params && typeof device.params === 'object' && !Array.isArray(device.params)
    ? device.params as Record<string, unknown>
    : {};
  return 'switch' in params || Array.isArray(params.switches) || 'pulse' in params || Array.isArray(params.timers);
}

type EwelinkApiBody<T = unknown> = { error?: number; msg?: string; data?: T };

function tokenEwelinkRechazado(response: Response, body: EwelinkApiBody) {
  return response.status === 401 || body.error === 401 || body.error === 402;
}

function cuotaEwelinkAgotada(body: EwelinkApiBody) {
  return /invoke too much|too many|rate limit/i.test(String(body.msg ?? ''));
}

async function actualizarEstadoEwelink(
  integration: { id: string; credencialesCifradas: string | null },
  dispositivoExternoId: string,
  params: Record<string, unknown>,
  timeoutMessage: string,
) {
  let authorized = await credencialesAutorizadas(integration);
  const send = async () => {
    await esperarTurnoEstadoEwelink();
    const response = await fetch(`${authorized.domain}/v2/device/thing/status`, {
      method: 'POST',
      headers: {
        'X-CK-Appid': authorized.credentials.appId,
        'X-CK-Nonce': nonce(),
        Authorization: `Bearer ${authorized.credentials.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ type: 1, id: dispositivoExternoId, params }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as EwelinkApiBody;
    return { response, body };
  };
  let result: Awaited<ReturnType<typeof send>>;
  try {
    result = await send();
    if (tokenEwelinkRechazado(result.response, result.body)) {
      authorized = await credencialesAutorizadas(integration, true);
      result = await send();
    }
  } catch (error) {
    if (Number((error as { status?: number })?.status) === 401) throw error;
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? timeoutMessage
      : 'No se pudo enviar la operación a eWeLink.';
    throw Object.assign(new Error(message), { status: 502, cause: error });
  }
  if (!result.response.ok || result.body.error) {
    if (tokenEwelinkRechazado(result.response, result.body)) {
      throw Object.assign(new Error('eWeLink rechazó la autorización. Volvé a conectar la cuenta.'), { status: 401 });
    }
    if (result.body.error === 4002 || result.body.error === 30022) {
      throw Object.assign(new Error('eWeLink confirmó que el dispositivo está fuera de línea o no acepta esta maniobra.'), { status: 409 });
    }
    if (cuotaEwelinkAgotada(result.body)) {
      throw Object.assign(new Error('eWeLink alcanzó temporalmente el límite de consultas. Esperá un minuto y volvé a operar.'), { status: 429 });
    }
    throw Object.assign(new Error(`eWeLink no ejecutó la operación (código ${result.body.error ?? result.response.status}).`), { status: 502 });
  }
}

export async function ejecutarCanalEwelink(integracionId: string, dispositivoExternoId: string, canal: number, encendido: boolean) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'sonoff_ewelink') throw Object.assign(new Error('Conector SONOFF no encontrado.'), { status: 404 });
  const params = crearParametrosCanalEwelink(canal, encendido);
  await actualizarEstadoEwelink(integration, dispositivoExternoId, params, 'eWeLink no confirmó la operación dentro de 15 segundos.');
  return { ok: true, canal, encendido, params };
}

export type AccionMotorEwelink = 'abrir' | 'detener' | 'cerrar';

export function crearParametrosMotorEwelink(accion: AccionMotorEwelink) {
  const motorTurn = { detener: 0, abrir: 1, cerrar: 2 }[accion];
  if (motorTurn === undefined) throw Object.assign(new Error('Seleccioná abrir, detener o cerrar.'), { status: 400 });
  return { motorTurn };
}

export async function ejecutarMotorEwelink(integracionId: string, dispositivoExternoId: string, accion: AccionMotorEwelink) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'sonoff_ewelink') throw Object.assign(new Error('Conector SONOFF no encontrado.'), { status: 404 });
  const params = crearParametrosMotorEwelink(accion);
  await actualizarEstadoEwelink(integration, dispositivoExternoId, params, 'eWeLink no confirmó la maniobra del motor dentro de 15 segundos.');
  return { ok: true, accion, params };
}

export async function sincronizarEwelink(integracionId: string) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'sonoff_ewelink') throw Object.assign(new Error('Conector SONOFF no encontrado.'), { status: 404 });
  let authorized = await credencialesAutorizadas(integration);

  const fetchThings = (credentials: EwelinkCredentials, domain: string) => fetch(`${domain}/v2/device/thing?lang=en&num=0`, {
    headers: {
      'X-CK-Appid': credentials.appId,
      'X-CK-Nonce': randomBytes(6).toString('hex').slice(0, 8),
      Authorization: `Bearer ${credentials.accessToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
  });
  let response: Response;
  try {
    response = await fetchThings(authorized.credentials, authorized.domain);
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'eWeLink no respondió dentro de 15 segundos.'
      : 'No se pudo conectar con la nube eWeLink.';
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: message } });
    throw Object.assign(new Error(message), { status: 502 });
  }
  let body = await response.json().catch(() => ({})) as { error?: number; msg?: string; data?: { thingList?: Array<{ itemType?: number; itemData?: Record<string, unknown> }> } };
  if (tokenEwelinkRechazado(response, body)) {
    try {
      authorized = await credencialesAutorizadas(integration, true);
      response = await fetchThings(authorized.credentials, authorized.domain);
      body = await response.json().catch(() => ({})) as typeof body;
    } catch (error) {
      const message = 'eWeLink rechazó la renovación automática. Volvé a autorizar la cuenta.';
      await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: message } });
      throw Object.assign(new Error(message), { status: 401, cause: error });
    }
  }
  if (!response.ok || body.error) {
    const authorizationFailed = tokenEwelinkRechazado(response, body);
    const quotaExceeded = cuotaEwelinkAgotada(body);
    const message = authorizationFailed
      ? 'eWeLink rechazó el Access Token. Volvé a autorizar la cuenta.'
      : quotaExceeded
        ? 'eWeLink alcanzó temporalmente el límite de consultas. La sincronización se reintentará más tarde.'
        : `eWeLink rechazó la sincronización (código ${body.error ?? response.status}).`;
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: message } });
    throw Object.assign(new Error(message), { status: authorizationFailed ? 401 : quotaExceeded ? 429 : 502 });
  }

  const { credentials, domain } = authorized;
  const things = body.data?.thingList ?? [];
  const archivedIds = new Set((await prisma.dispositivoIoT.findMany({
    where: { integracionId: integration.id, archivadoEn: { not: null } },
    select: { identificadorExterno: true },
  })).map((device) => device.identificadorExterno));
  asegurarTiempoRealEwelink(integration, credentials, String(credentials.region ?? 'us'), domain).catch((error) => {
    console.warn('[ewelink] no se pudo iniciar tiempo real:', integration.id, error instanceof Error ? error.message : error);
  });
  const dynamicDevices = things
    .filter((thing) => thing.itemType === 1 && requiereEstadoEfectivoEwelink(thing.itemData ?? {}))
    .map((thing) => thing.itemData ?? {})
    .filter((device): device is Record<string, unknown> & { deviceid: string } => typeof device.deviceid === 'string');
  const freshParams = new Map<string, Record<string, unknown>>();
  if (dynamicDevices.length) {
    const cursor = freshStatusCursor.get(integration.id) ?? 0;
    const amount = Math.min(FRESH_STATUS_LIMIT, dynamicDevices.length);
    const selected = Array.from({ length: amount }, (_, index) => dynamicDevices[(cursor + index) % dynamicDevices.length]);
    freshStatusCursor.set(integration.id, (cursor + amount) % dynamicDevices.length);
    for (const device of selected) {
      try {
        freshParams.set(device.deviceid, await obtenerEstadoEfectivoEwelink(domain, credentials, device.deviceid));
      } catch (error) {
        console.warn('[ewelink] estado efectivo:', device.deviceid, error instanceof Error ? error.message : error);
      }
    }
  }
  let imported = 0;
  for (const thing of things) {
    if (thing.itemType !== 1 && thing.itemType !== 2) continue;
    const listedDevice = thing.itemData ?? {};
    const listedId = listedDevice.deviceid;
    const device = combinarEstadoEwelink(listedDevice, typeof listedId === 'string' ? freshParams.get(listedId) : undefined);
    const id = device.deviceid;
    if (typeof id !== 'string') continue;
    if (archivedIds.has(id)) continue;
    const readings = { ...normalizarMagnitudesEwelink(extraerLecturasEwelink(device.params), device), online: normalizarOnlineEwelink(device.online) };
    if (!Object.keys(readings).length) continue;
    await procesarEventoIoT(integration.id, normalizarEventoIoT({
      deviceId: id,
      deviceName: device.name,
      model: device.productModel ?? (device.extra as Record<string, unknown> | undefined)?.model,
      deviceType: clasificarDispositivoEwelink(device),
      uiid: device.uiid ?? (device.extra as Record<string, unknown> | undefined)?.uiid,
      readings,
      timestamp: new Date().toISOString(),
    }));
    imported += 1;
  }
  await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'conectada', ultimoEventoEn: new Date(), ultimoError: null } });
  return { ok: true, dispositivosImportados: imported, totalInformado: things.length };
}

async function sincronizarEwelinkProgramado() {
  const integrations = await prisma.integracionIoT.findMany({
    where: {
      proveedor: 'sonoff_ewelink',
      estado: { in: ['configurada', 'conectada', 'error'] },
      credencialesCifradas: { not: null },
      empresa: { moduloControl: { estado: 'activo' } },
    },
    take: 100,
  });
  for (const integration of integrations) {
    if (syncing.has(integration.id)) continue;
    const config = integration.configuracion && typeof integration.configuracion === 'object' && !Array.isArray(integration.configuracion)
      ? integration.configuracion as Record<string, unknown>
      : {};
    // El WebSocket entrega los cambios en vivo. REST queda como reconciliación
    // de respaldo para no agotar la cuota de los APPID Standard.
    const seconds = Math.min(3600, Math.max(300, Number(config.pollingSeconds) || 300));
    const authorizationError = integration.estado === 'error' && /autorización|access token|credenciales/i.test(integration.ultimoError ?? '');
    const quotaError = integration.estado === 'error' && /límite de consultas|invoke too much|too many|rate limit/i.test(integration.ultimoError ?? '');
    const retrySeconds = integration.estado === 'error' ? (authorizationError || quotaError ? 15 * 60 : 60) : seconds;
    const lastAttempt = integration.estado === 'error' ? integration.actualizadaEn : integration.ultimoEventoEn;
    if (lastAttempt && Date.now() - lastAttempt.getTime() < retrySeconds * 1000) continue;
    syncing.add(integration.id);
    try {
      await sincronizarEwelink(integration.id);
    } catch (error) {
      console.error('[ewelink] sincronización programada:', integration.id, error instanceof Error ? error.message : error);
    } finally {
      syncing.delete(integration.id);
    }
  }
}

export function iniciarSincronizadorEwelink() {
  // Sólo revisa vencimientos; el WebSocket conserva la vista en vivo.
  const timer = setInterval(() => sincronizarEwelinkProgramado().catch((error) => console.error('[ewelink] programador:', error)), 10_000);
  timer.unref();
}
