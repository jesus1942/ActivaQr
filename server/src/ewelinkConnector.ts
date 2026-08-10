import { randomBytes } from 'crypto';
import { prisma } from './prisma';
import { descifrarCredenciales } from './iotSecrets';
import { normalizarEventoIoT, procesarEventoIoT } from './iotIngest';

const DOMAINS: Record<string, string> = {
  cn: 'https://cn-apia.coolkit.cn',
  as: 'https://as-apia.coolkit.cc',
  us: 'https://us-apia.coolkit.cc',
  eu: 'https://eu-apia.coolkit.cc',
};
const syncing = new Set<string>();

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
  const credentials = descifrarCredenciales(integration.credencialesCifradas);
  const appId = String(credentials.appId ?? '');
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
