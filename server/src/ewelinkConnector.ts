import { createHmac, randomBytes } from 'crypto';
import { prisma } from './prisma';
import { cifrarCredenciales, descifrarCredenciales, firmarEstadoOAuth } from './iotSecrets';
import { normalizarEventoIoT, procesarEventoIoT } from './iotIngest';

const DOMAINS: Record<string, string> = {
  cn: 'https://cn-apia.coolkit.cn',
  as: 'https://as-apia.coolkit.cc',
  us: 'https://us-apia.coolkit.cc',
  eu: 'https://eu-apia.coolkit.cc',
};
const syncing = new Set<string>();
export const EWELINK_REDIRECT_URL = process.env.EWELINK_REDIRECT_URL?.trim()
  || 'https://api.activaqr.net/api/iot/ewelink/oauth/callback';

type EwelinkCredentials = {
  appId: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  atExpiredTime?: number;
  rtExpiredTime?: number;
  region?: string;
  redirectUrl?: string;
};

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
    atExpiredTime: payload.atExpiredTime ? Number(payload.atExpiredTime) : undefined,
    rtExpiredTime: payload.rtExpiredTime ? Number(payload.rtExpiredTime) : undefined,
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
  if (!response.ok || result.error) throw Object.assign(new Error(`eWeLink respondió ${response.status}: ${result.msg || `error ${result.error ?? 'desconocido'}`}`), { status: 502 });
  if (!result.data) throw Object.assign(new Error('eWeLink no devolvió las credenciales esperadas.'), { status: 502 });
  return result.data;
}

export function crearAutorizacionEwelink(params: { integrationId: string; empresaId: string; userId: string; appId: string; appSecret: string }) {
  const seq = String(Date.now());
  const state = firmarEstadoOAuth({ integrationId: params.integrationId, empresaId: params.empresaId, userId: params.userId, exp: Date.now() + 5 * 60_000 });
  const query = new URLSearchParams({
    state,
    clientId: params.appId,
    authorization: sign(params.appSecret, `${params.appId}_${seq}`),
    seq,
    redirectUrl: EWELINK_REDIRECT_URL,
    nonce: nonce(),
    grantType: 'authorization_code',
    showQRCode: 'false',
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
  return sincronizarEwelink(integration.id);
}

async function renovarTokenEwelink(integrationId: string, credentials: EwelinkCredentials): Promise<EwelinkCredentials> {
  const region = credentials.region ?? 'us';
  if (!DOMAINS[region] || !credentials.refreshToken) throw Object.assign(new Error('La autorización eWeLink venció. Volvé a conectar la cuenta.'), { status: 401 });
  const token = await postSigned<{ at: string; rt: string }>(DOMAINS[region], '/v2/user/refresh', credentials, { rt: credentials.refreshToken });
  const renewed: EwelinkCredentials = {
    ...credentials,
    accessToken: token.at,
    refreshToken: token.rt,
    atExpiredTime: Date.now() + 30 * 24 * 60 * 60_000,
    rtExpiredTime: Date.now() + 60 * 24 * 60 * 60_000,
  };
  await prisma.integracionIoT.update({ where: { id: integrationId }, data: { credencialesCifradas: cifrarCredenciales(renewed) } });
  return renewed;
}

function scalarParams(value: unknown): Record<string, number | boolean | string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, number | boolean | string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'number' || typeof item === 'boolean') result[key] = item;
    else if (typeof item === 'string') {
      const numeric = Number(item);
      result[key] = item.trim() !== '' && Number.isFinite(numeric) ? numeric : item === 'on' ? true : item === 'off' ? false : item;
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
  return result;
}

export async function sincronizarEwelink(integracionId: string) {
  const integration = await prisma.integracionIoT.findUnique({ where: { id: integracionId } });
  if (!integration || integration.proveedor !== 'sonoff_ewelink') throw Object.assign(new Error('Conector SONOFF no encontrado.'), { status: 404 });
  if (!integration.credencialesCifradas) throw Object.assign(new Error('Primero guardá las credenciales eWeLink.'), { status: 409 });
  let credentials = credentialsOf(descifrarCredenciales(integration.credencialesCifradas));
  if (credentials.atExpiredTime && credentials.atExpiredTime < Date.now() + 5 * 60_000) credentials = await renovarTokenEwelink(integration.id, credentials);
  const appId = credentials.appId;
  const accessToken = String(credentials.accessToken ?? '');
  const region = String(credentials.region ?? 'us');
  if (!appId || !accessToken || !DOMAINS[region]) throw Object.assign(new Error('Las credenciales o la región eWeLink no son válidas.'), { status: 400 });

  let response: Response;
  try {
    response = await fetch(`${DOMAINS[region]}/v2/device/thing?lang=en&num=0`, {
      headers: {
        'X-CK-Appid': appId,
        'X-CK-Nonce': randomBytes(6).toString('hex').slice(0, 8),
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'eWeLink no respondió dentro de 15 segundos.'
      : 'No se pudo conectar con la nube eWeLink.';
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: message } });
    throw Object.assign(new Error(message), { status: 502 });
  }
  const body = await response.json().catch(() => ({})) as { error?: number; msg?: string; data?: { thingList?: Array<{ itemType?: number; itemData?: Record<string, unknown> }> } };
  if (!response.ok || body.error) {
    const message = response.status === 401 || body.error === 401
      ? 'eWeLink rechazó el Access Token. Volvé a autorizar la cuenta.'
      : `eWeLink respondió ${response.status}: ${body.msg || `error ${body.error ?? 'desconocido'}`}`;
    await prisma.integracionIoT.update({ where: { id: integration.id }, data: { estado: 'error', ultimoError: message } });
    throw Object.assign(new Error(message), { status: response.status === 401 ? 401 : 502 });
  }

  const things = body.data?.thingList ?? [];
  let imported = 0;
  for (const thing of things) {
    if (thing.itemType !== 1 && thing.itemType !== 2) continue;
    const device = thing.itemData ?? {};
    const id = device.deviceid;
    if (typeof id !== 'string') continue;
    const readings = { ...scalarParams(device.params), online: Boolean(device.online) };
    if (!Object.keys(readings).length) continue;
    await procesarEventoIoT(integration.id, normalizarEventoIoT({
      deviceId: id,
      deviceName: device.name,
      model: device.productModel ?? (device.extra as Record<string, unknown> | undefined)?.model,
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
      estado: { in: ['configurada', 'conectada'] },
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
    const seconds = Math.min(3600, Math.max(60, Number(config.pollingSeconds) || 300));
    if (integration.ultimoEventoEn && Date.now() - integration.ultimoEventoEn.getTime() < seconds * 1000) continue;
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
  const timer = setInterval(() => sincronizarEwelinkProgramado().catch((error) => console.error('[ewelink] programador:', error)), 30_000);
  timer.unref();
}
