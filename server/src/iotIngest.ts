import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { enviarPushAEmpresa } from './push';
import { registrarAuditoria } from './auditoria';

type Scalar = number | boolean | string;

export interface EventoIoTNormalizado {
  dispositivoExternoId: string;
  nombre?: string;
  modelo?: string;
  tipo?: string;
  medidaEn: Date;
  lecturas: Record<string, Scalar>;
  bateria?: number;
  rssi?: number;
  raw: Record<string, unknown>;
}

const RESERVED = new Set([
  'devEUI', 'dev_eui', 'deviceId', 'device_id', 'id', 'name', 'deviceName', 'model',
  'deviceType', 'uiid', 'timestamp', 'time', 'receivedAt', 'battery', 'bateria', 'rssi', 'snr', 'raw', 'data', 'object', 'readings',
]);

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function scalarEntries(value: unknown): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(object(value)).filter(([, item]) =>
    typeof item === 'number' || typeof item === 'boolean' || typeof item === 'string'
  )) as Record<string, Scalar>;
}

function numberOrUndefined(...values: unknown[]): number | undefined {
  const found = values.find((item) => typeof item === 'number' && Number.isFinite(item));
  return typeof found === 'number' ? found : undefined;
}

export function normalizarEventoIoT(body: unknown): EventoIoTNormalizado {
  const root = object(body);
  const device = object(root.device);
  const id = root.devEUI ?? root.dev_eui ?? root.deviceId ?? root.device_id ?? device.devEUI ?? device.id ?? root.id;
  if (typeof id !== 'string' || !id.trim()) {
    const error = new Error('El evento no incluye devEUI o deviceId.');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const explicit = scalarEntries(root.readings);
  const decoded = scalarEntries(root.object);
  const data = scalarEntries(root.data);
  const topLevel = Object.fromEntries(Object.entries(root).filter(([key, item]) =>
    !RESERVED.has(key) && (typeof item === 'number' || typeof item === 'boolean' || typeof item === 'string')
  )) as Record<string, Scalar>;
  const lecturas = { ...topLevel, ...data, ...decoded, ...explicit };
  if (!Object.keys(lecturas).length) {
    const error = new Error('El evento no contiene lecturas decodificadas. Configurá el decoder del UG65 para enviar JSON.');
    (error as Error & { status?: number }).status = 422;
    throw error;
  }

  const timeRaw = root.timestamp ?? root.time ?? root.receivedAt;
  const parsed = typeof timeRaw === 'number'
    ? new Date(timeRaw > 10_000_000_000 ? timeRaw : timeRaw * 1000)
    : typeof timeRaw === 'string' ? new Date(timeRaw) : new Date();

  return {
    dispositivoExternoId: id.trim(),
    nombre: String(root.deviceName ?? root.name ?? device.name ?? '').trim() || undefined,
    modelo: String(root.model ?? device.model ?? '').trim() || undefined,
    tipo: String(root.deviceType ?? '').trim() || undefined,
    medidaEn: Number.isNaN(parsed.getTime()) ? new Date() : parsed,
    lecturas,
    bateria: numberOrUndefined(root.battery, root.bateria, lecturas.battery, lecturas.bateria),
    rssi: numberOrUndefined(root.rssi, lecturas.rssi),
    raw: root,
  };
}

const LABELS: Record<string, { nombre: string; unidad?: string }> = {
  temperature: { nombre: 'Temperatura', unidad: '°C' },
  temperatura: { nombre: 'Temperatura', unidad: '°C' },
  humidity: { nombre: 'Humedad', unidad: '%' },
  humedad: { nombre: 'Humedad', unidad: '%' },
  battery: { nombre: 'Batería', unidad: '%' },
  bateria: { nombre: 'Batería', unidad: '%' },
  rssi: { nombre: 'Señal', unidad: 'dBm' },
  pressure: { nombre: 'Presión' },
  presion: { nombre: 'Presión' },
  door: { nombre: 'Puerta' },
  puerta: { nombre: 'Puerta' },
  relay: { nombre: 'Relé' },
  switch: { nombre: 'Relé' },
  switch_1: { nombre: 'Canal 1' },
  switch_2: { nombre: 'Canal 2' },
  switch_3: { nombre: 'Canal 3' },
  switch_4: { nombre: 'Canal 4' },
  online: { nombre: 'Conexión' },
};

function claveSegura(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_áéíóúñ-]+/gi, '_').slice(0, 80);
}

function valorData(value: Scalar) {
  return typeof value === 'number'
    ? { tipo: 'numero', valorNumero: value, valorBooleano: null, valorTexto: null }
    : typeof value === 'boolean'
      ? { tipo: 'booleano', valorNumero: null, valorBooleano: value, valorTexto: null }
      : { tipo: 'texto', valorNumero: null, valorBooleano: null, valorTexto: value.slice(0, 500) };
}

function cumple(regla: { operador: string; umbralNumero: number | null; umbralBooleano: boolean | null; umbralTexto: string | null }, value: Scalar): boolean {
  const threshold = typeof value === 'number' ? regla.umbralNumero : typeof value === 'boolean' ? regla.umbralBooleano : regla.umbralTexto;
  if (threshold === null || threshold === undefined) return false;
  switch (regla.operador) {
    case 'gt': return typeof value === 'number' && typeof threshold === 'number' && value > threshold;
    case 'gte': return typeof value === 'number' && typeof threshold === 'number' && value >= threshold;
    case 'lt': return typeof value === 'number' && typeof threshold === 'number' && value < threshold;
    case 'lte': return typeof value === 'number' && typeof threshold === 'number' && value <= threshold;
    case 'eq': return String(value) === String(threshold);
    case 'neq': return String(value) !== String(threshold);
    default: return false;
  }
}

async function evaluarReglas(params: {
  empresaId: string;
  dispositivoId: string;
  variableId: string;
  value: Scalar;
  medidaEn: Date;
}) {
  const reglas = await prisma.reglaAlarmaIoT.findMany({ where: { variableId: params.variableId, activa: true } });
  for (const regla of reglas) {
    let disparada = cumple(regla, params.value);
    if (disparada && regla.demoraSegundos > 0) {
      const desde = new Date(params.medidaEn.getTime() - regla.demoraSegundos * 1000);
      const ventana = await prisma.lecturaIoT.findMany({
        where: { variableId: params.variableId, medidaEn: { gte: desde, lte: params.medidaEn } },
        orderBy: { medidaEn: 'asc' },
        take: 1000,
      });
      const cubreDemora = ventana[0] && ventana[0].medidaEn.getTime() <= desde.getTime() + 5000;
      disparada = Boolean(cubreDemora && ventana.every((item) => {
        const v = item.valorNumero ?? item.valorBooleano ?? item.valorTexto ?? '';
        return cumple(regla, v);
      }));
    }

    const abierta = await prisma.alarmaIoT.findFirst({ where: { reglaId: regla.id, dispositivoId: params.dispositivoId, estado: { in: ['activa', 'reconocida'] } } });
    if (disparada && !abierta) {
      const alarma = await prisma.alarmaIoT.create({ data: {
        empresaId: params.empresaId,
        dispositivoId: params.dispositivoId,
        variableId: params.variableId,
        reglaId: regla.id,
        titulo: regla.nombre,
        detalle: `Valor recibido: ${String(params.value)}`,
        severidad: regla.severidad,
        valorDisparador: String(params.value),
        iniciadaEn: params.medidaEn,
      } });
      if (regla.notificarPush) {
        enviarPushAEmpresa(params.empresaId, {
          title: regla.severidad === 'critica' ? `Alarma crítica: ${regla.nombre}` : `ActivaQR Control: ${regla.nombre}`,
          body: `Valor recibido: ${String(params.value)}`,
          url: '#/control-industrial',
        }, ['admin', 'mantenimiento', 'jefatura']).catch(() => {});
      }
      await registrarAuditoria({ empresaId: params.empresaId, usuarioNombre: 'ActivaQR Control', usuarioRol: 'sistema', accion: 'alarma', entidad: 'AlarmaIoT', entidadId: alarma.id, detalle: regla.nombre });
    } else if (!disparada && abierta) {
      await prisma.alarmaIoT.update({ where: { id: abierta.id }, data: { estado: 'resuelta', resueltaEn: params.medidaEn, resolucion: 'La variable volvió al rango configurado.' } });
    }
  }
}

export async function procesarEventoIoT(integracionId: string, evento: EventoIoTNormalizado) {
  const integracion = await prisma.integracionIoT.findUnique({
    where: { id: integracionId },
    include: { empresa: { include: { moduloControl: true } } },
  });
  if (!integracion || integracion.empresa.moduloControl?.estado !== 'activo') {
    const error = new Error('La integración o el módulo no están activos.');
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  const config = object(integracion.configuracion);
  let dispositivo = await prisma.dispositivoIoT.findUnique({
    where: { integracionId_identificadorExterno: { integracionId, identificadorExterno: evento.dispositivoExternoId } },
  });
  if (!dispositivo) {
    if (config.autoDiscover === false) {
      const error = new Error('Dispositivo no registrado y autodescubrimiento deshabilitado.');
      (error as Error & { status?: number }).status = 404;
      throw error;
    }
    const count = await prisma.dispositivoIoT.count({ where: { empresaId: integracion.empresaId } });
    const limite = integracion.empresa.moduloControl?.limiteDispositivos ?? 0;
    if (count >= limite) {
      const error = new Error('El tenant alcanzó el límite contratado de dispositivos.');
      (error as Error & { status?: number }).status = 409;
      throw error;
    }
    dispositivo = await prisma.dispositivoIoT.create({ data: {
      empresaId: integracion.empresaId,
      integracionId,
      identificadorExterno: evento.dispositivoExternoId,
      nombre: evento.nombre ?? `Dispositivo ${evento.dispositivoExternoId.slice(-6)}`,
      modelo: evento.modelo,
      tipo: evento.tipo ?? 'sensor',
    } });
  }

  if (!dispositivo.habilitado) {
    const error = new Error('El dispositivo está pausado.');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.dispositivoIoT.update({ where: { id: dispositivo!.id }, data: {
      ultimoContactoEn: evento.medidaEn,
      bateria: evento.bateria,
      rssi: evento.rssi,
      estado: 'normal',
      modelo: evento.modelo ?? dispositivo!.modelo,
      tipo: evento.tipo ?? dispositivo!.tipo,
      metadatos: evento.raw as Prisma.InputJsonValue,
    } });
    await tx.integracionIoT.update({ where: { id: integracionId }, data: { estado: 'conectada', ultimoEventoEn: new Date(), ultimoError: null } });
    for (const [rawKey, value] of Object.entries(evento.lecturas)) {
      const clave = claveSegura(rawKey);
      if (!clave) continue;
      const meta = LABELS[clave] ?? { nombre: rawKey.replace(/[_-]+/g, ' ') };
      const values = valorData(value);
      const variable = await tx.variableIoT.upsert({
        where: { dispositivoId_clave: { dispositivoId: dispositivo!.id, clave } },
        create: { empresaId: integracion.empresaId, dispositivoId: dispositivo!.id, clave, nombre: meta.nombre, unidad: meta.unidad, ...values, medidaEn: evento.medidaEn },
        update: { ...values, medidaEn: evento.medidaEn, calidad: 'buena' },
      });
      const { tipo: _tipo, ...readingValues } = values;
      await tx.lecturaIoT.create({ data: { variableId: variable.id, ...readingValues, medidaEn: evento.medidaEn } });
    }
  });

  const normalizedReadings = Object.fromEntries(Object.entries(evento.lecturas).map(([key, value]) => [claveSegura(key), value]));
  const variables = await prisma.variableIoT.findMany({ where: { dispositivoId: dispositivo.id } });
  for (const variable of variables) {
    if (!(variable.clave in normalizedReadings)) continue;
    await evaluarReglas({ empresaId: integracion.empresaId, dispositivoId: dispositivo.id, variableId: variable.id, value: normalizedReadings[variable.clave], medidaEn: evento.medidaEn });
  }

  const criticas = await prisma.alarmaIoT.count({ where: { dispositivoId: dispositivo.id, estado: { in: ['activa', 'reconocida'] }, severidad: 'critica' } });
  const advertencias = await prisma.alarmaIoT.count({ where: { dispositivoId: dispositivo.id, estado: { in: ['activa', 'reconocida'] } } });
  await prisma.dispositivoIoT.update({ where: { id: dispositivo.id }, data: { estado: criticas ? 'critico' : advertencias ? 'advertencia' : 'normal' } });
  return { ok: true, dispositivoId: dispositivo.id, variables: Object.keys(evento.lecturas).length };
}

/** Retención contractual. Conserva el último valor en VariableIoT y elimina
 * únicamente el histórico crudo que excede la ventana de cada tenant. */
export async function limpiarLecturasIoTExpiradas(): Promise<number> {
  const modules = await prisma.moduloControlEmpresa.findMany({ select: { empresaId: true, retencionDias: true } });
  let removed = 0;
  for (const module of modules) {
    const result = await prisma.lecturaIoT.deleteMany({ where: {
      variable: { empresaId: module.empresaId },
      medidaEn: { lt: new Date(Date.now() - module.retencionDias * 86_400_000) },
    } });
    removed += result.count;
  }
  return removed;
}
