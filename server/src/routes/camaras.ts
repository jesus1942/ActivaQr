import { randomBytes } from 'crypto';
import { isIP } from 'net';
import { NextFunction, Request, Response, Router } from 'express';
import { AuthRequest, requireAdmin, requireJefatura } from '../auth';
import { auditar } from '../auditoria';
import { hashToken } from '../iotSecrets';
import { prisma } from '../prisma';
import { enviarPushAEmpresa } from '../push';

const PROVEEDORES = new Set(['onvif', 'frigate', 'hikvision', 'dahua', 'reolink', 'tuya', 'generico']);
const TIPOS_EVENTO = new Set(['movimiento', 'persona', 'vehiculo', 'animal', 'linea', 'manipulacion', 'desconexion']);

function statusError(message: string, status = 400) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

function tenantId(req: AuthRequest) {
  if (!req.auth?.empresaId) throw statusError('La sesión no pertenece a una empresa.', 403);
  return req.auth.empresaId;
}

export function urlSeguraReproduccion(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.length > 2000) throw statusError('La URL de video es demasiado larga.');
  let parsed: URL;
  try { parsed = new URL(text); } catch { throw statusError('La reproducción debe usar una URL HTTPS válida.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw statusError('La reproducción debe usar HTTPS y no puede contener usuario ni contraseña.');
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.lan') || hostname.endsWith('.internal')) throw statusError('La reproducción no puede apuntar a una dirección local o interna.');
  if (isIP(hostname) === 6) throw statusError('La reproducción no admite direcciones IPv6 literales; usá el dominio HTTPS del gateway.');
  if (isIP(hostname) === 4) {
    const [a, b] = hostname.split('.').map(Number);
    const privateIp = a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
    if (privateIp) throw statusError('La reproducción no puede apuntar a una dirección local o interna.');
  }
  return parsed.toString();
}

function publicIntegration<T extends { webhookTokenHash?: string | null; credencialesCifradas?: string | null }>(item: T) {
  const { webhookTokenHash: _hash, credencialesCifradas, ...safe } = item;
  return { ...safe, credencialesConfiguradas: Boolean(credencialesCifradas) };
}

async function moduloActivo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const module = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId: tenantId(req) } });
    if (!module || module.estado !== 'activo') return res.status(403).json({ code: 'modulo_control_no_habilitado', error: 'ActivaQR Control no está habilitado para esta empresa.' });
    next();
  } catch (error) { next(error); }
}

export function agruparEventosCamaraPorHora(events: Array<{ iniciadoEn: Date; tipo: string }>) {
  const end = new Date();
  end.setMinutes(0, 0, 0);
  const buckets = Array.from({ length: 24 }, (_, index) => {
    const inicio = new Date(end.getTime() - (23 - index) * 3600_000);
    return { inicio: inicio.toISOString(), total: 0, movimiento: 0, personas: 0, vehiculos: 0 };
  });
  for (const event of events) {
    const index = Math.floor((event.iniciadoEn.getTime() - new Date(buckets[0].inicio).getTime()) / 3600_000);
    if (index < 0 || index >= buckets.length) continue;
    buckets[index].total += 1;
    if (event.tipo === 'movimiento') buckets[index].movimiento += 1;
    if (event.tipo === 'persona') buckets[index].personas += 1;
    if (event.tipo === 'vehiculo') buckets[index].vehiculos += 1;
  }
  return buckets;
}

export const camarasRouter = Router();
camarasRouter.use(moduloActivo);

camarasRouter.get('/resumen', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const since = new Date(Date.now() - 24 * 3600_000);
    const [integraciones, camaras, eventos, eventos24h] = await Promise.all([
      prisma.integracionCamara.findMany({ where: { empresaId }, orderBy: { creadaEn: 'asc' } }),
      prisma.camara.findMany({ where: { empresaId }, include: { integracion: { select: { proveedor: true, nombre: true } } }, orderBy: { nombre: 'asc' } }),
      prisma.eventoCamara.findMany({ where: { empresaId }, include: { camara: { select: { nombre: true, ubicacion: true } } }, orderBy: { iniciadoEn: 'desc' }, take: 100 }),
      prisma.eventoCamara.findMany({ where: { empresaId, iniciadoEn: { gte: since } }, select: { iniciadoEn: true, tipo: true }, orderBy: { iniciadoEn: 'asc' }, take: 10_000 }),
    ]);
    res.json({ integraciones: integraciones.map(publicIntegration), camaras, eventos, movimientosPorHora: agruparEventosCamaraPorHora(eventos24h) });
  } catch (error) { next(error); }
});

camarasRouter.post('/integraciones', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const proveedor = String(req.body?.proveedor ?? '').trim();
    const nombre = String(req.body?.nombre ?? '').trim().slice(0, 120);
    if (!PROVEEDORES.has(proveedor) || !nombre) throw statusError('Elegí un conector de cámaras y un nombre válidos.');
    const integration = await prisma.integracionCamara.create({ data: {
      empresaId, nombre, proveedor,
      configuracion: { notificarTipos: ['persona', 'manipulacion', 'desconexion'], zonaHoraria: 'America/Argentina/Catamarca' },
    } });
    await auditar(req, 'crear', 'IntegracionCamara', integration.id, `Conector de cámaras ${proveedor}: ${nombre}.`);
    res.status(201).json(publicIntegration(integration));
  } catch (error) { next(error); }
});

camarasRouter.post('/integraciones/:id/webhook-token', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const integration = await prisma.integracionCamara.findFirst({ where: { id: req.params.id, empresaId } });
    if (!integration) throw statusError('Conector de cámaras no encontrado.', 404);
    const token = randomBytes(32).toString('base64url');
    await prisma.integracionCamara.update({ where: { id: integration.id }, data: { webhookTokenHash: hashToken(token), webhookTokenHint: token.slice(-6), estado: 'configurada', ultimoError: null } });
    await auditar(req, 'editar', 'IntegracionCamara', integration.id, 'Token de eventos de cámaras rotado.');
    res.json({ token, endpoint: `/api/camaras/ingest/${token}`, advertencia: 'Copialo ahora. ActivaQR conserva solamente su hash.' });
  } catch (error) { next(error); }
});

camarasRouter.post('/equipos', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const integracionId = String(req.body?.integracionId ?? '');
    const integration = await prisma.integracionCamara.findFirst({ where: { id: integracionId, empresaId } });
    if (!integration) throw statusError('El conector no pertenece a esta empresa.', 404);
    const nombre = String(req.body?.nombre ?? '').trim().slice(0, 120);
    const identificadorExterno = String(req.body?.identificadorExterno ?? '').trim().slice(0, 200);
    if (!nombre || !identificadorExterno) throw statusError('Ingresá nombre e identificador de la cámara.');
    const protocol = String(req.body?.protocoloReproduccion ?? '').trim();
    if (protocol && !['hls', 'webrtc', 'jpeg'].includes(protocol)) throw statusError('El protocolo de reproducción no es válido.');
    const camera = await prisma.camara.create({ data: {
      empresaId, integracionId, nombre, identificadorExterno,
      ubicacion: String(req.body?.ubicacion ?? '').trim().slice(0, 160) || null,
      modelo: String(req.body?.modelo ?? '').trim().slice(0, 160) || null,
      reproduccionUrl: urlSeguraReproduccion(req.body?.reproduccionUrl), protocoloReproduccion: protocol || null,
      capacidades: { vivo: Boolean(req.body?.reproduccionUrl), movimiento: true, ptz: false, audio: false },
    } });
    await auditar(req, 'crear', 'Camara', camera.id, `Cámara ${nombre} registrada en ${integration.nombre}.`);
    res.status(201).json(camera);
  } catch (error) { next(error); }
});

camarasRouter.patch('/equipos/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const camera = await prisma.camara.findFirst({ where: { id: req.params.id, empresaId } });
    if (!camera) throw statusError('Cámara no encontrada.', 404);
    const data: Record<string, unknown> = {};
    for (const field of ['nombre', 'ubicacion', 'modelo'] as const) if (req.body?.[field] !== undefined) data[field] = String(req.body[field]).trim().slice(0, 160) || null;
    if (req.body?.habilitada !== undefined) data.habilitada = Boolean(req.body.habilitada);
    if (req.body?.reproduccionUrl !== undefined) data.reproduccionUrl = urlSeguraReproduccion(req.body.reproduccionUrl);
    if (req.body?.protocoloReproduccion !== undefined) {
      const protocol = String(req.body.protocoloReproduccion ?? '');
      if (protocol && !['hls', 'webrtc', 'jpeg'].includes(protocol)) throw statusError('El protocolo de reproducción no es válido.');
      data.protocoloReproduccion = protocol || null;
    }
    const updated = await prisma.camara.update({ where: { id: camera.id }, data });
    await auditar(req, 'editar', 'Camara', camera.id, 'Configuración de cámara actualizada.');
    res.json(updated);
  } catch (error) { next(error); }
});

type NormalizedCameraEvent = {
  externalCameraId: string; cameraName: string; eventId: string | null; type: string; label: string | null;
  zone: string | null; confidence: number | null; startedAt: Date; endedAt: Date | null; snapshotUrl: string | null; clipUrl: string | null;
};

export function normalizarEventoCamara(body: Record<string, unknown>): NormalizedCameraEvent {
  const after = body.after && typeof body.after === 'object' && !Array.isArray(body.after) ? body.after as Record<string, unknown> : body;
  const externalCameraId = String(after.camera ?? after.cameraId ?? body.camera ?? body.cameraId ?? '').trim();
  const cameraName = String(after.cameraName ?? body.cameraName ?? externalCameraId).trim().slice(0, 120);
  const rawLabel = String(after.label ?? body.label ?? after.type ?? body.type ?? 'movimiento').toLowerCase();
  const mappedType = rawLabel === 'person' ? 'persona' : rawLabel === 'car' || rawLabel === 'vehicle' ? 'vehiculo' : rawLabel === 'dog' || rawLabel === 'cat' || rawLabel === 'animal' ? 'animal' : rawLabel === 'motion' ? 'movimiento' : rawLabel;
  const type = TIPOS_EVENTO.has(mappedType) ? mappedType : 'movimiento';
  const startedRaw = after.start_time ?? after.startedAt ?? body.startedAt ?? body.timestamp;
  const endedRaw = after.end_time ?? after.endedAt ?? body.endedAt;
  const numericStarted = typeof startedRaw === 'number' ? new Date(startedRaw < 10_000_000_000 ? startedRaw * 1000 : startedRaw) : new Date(String(startedRaw ?? new Date().toISOString()));
  if (!externalCameraId || Number.isNaN(numericStarted.getTime())) throw statusError('El evento necesita cameraId y una fecha válida.', 422);
  const zones = after.current_zones ?? after.entered_zones ?? body.zones;
  const confidenceRaw = after.score ?? after.top_score ?? body.confidence;
  const confidence = confidenceRaw === undefined ? null : Number(confidenceRaw);
  return {
    externalCameraId, cameraName, eventId: String(after.id ?? body.eventId ?? '').trim().slice(0, 200) || null,
    type, label: rawLabel.slice(0, 100), zone: Array.isArray(zones) ? String(zones[0] ?? '').slice(0, 120) || null : String(body.zone ?? '').slice(0, 120) || null,
    confidence: confidence !== null && Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : null,
    startedAt: numericStarted,
    endedAt: endedRaw ? new Date(typeof endedRaw === 'number' && endedRaw < 10_000_000_000 ? endedRaw * 1000 : String(endedRaw)) : null,
    snapshotUrl: urlSeguraReproduccion(body.snapshotUrl), clipUrl: urlSeguraReproduccion(body.clipUrl),
  };
}

export const camarasIngestRouter = Router();
camarasIngestRouter.post('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await prisma.integracionCamara.findUnique({ where: { webhookTokenHash: hashToken(req.params.token) } });
    if (!integration) throw statusError('Token de cámaras inválido.', 401);
    const module = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId: integration.empresaId } });
    if (!module || module.estado !== 'activo') throw statusError('El servicio de cámaras no está activo.', 403);
    const event = normalizarEventoCamara(req.body && typeof req.body === 'object' ? req.body : {});
    const camera = await prisma.camara.upsert({
      where: { integracionId_identificadorExterno: { integracionId: integration.id, identificadorExterno: event.externalCameraId } },
      create: { empresaId: integration.empresaId, integracionId: integration.id, identificadorExterno: event.externalCameraId, nombre: event.cameraName, estado: 'en_linea', ultimoContactoEn: new Date(), ultimoMovimientoEn: event.startedAt, capacidades: { vivo: false, movimiento: true } },
      update: { estado: 'en_linea', ultimoContactoEn: new Date(), ...(event.type !== 'desconexion' ? { ultimoMovimientoEn: event.startedAt } : {}) },
    });
    const created = event.eventId
      ? await prisma.eventoCamara.upsert({
          where: { camaraId_identificadorExterno: { camaraId: camera.id, identificadorExterno: event.eventId } },
          create: { empresaId: integration.empresaId, camaraId: camera.id, identificadorExterno: event.eventId, tipo: event.type, etiqueta: event.label, zona: event.zone, confianza: event.confidence, iniciadoEn: event.startedAt, finalizadoEn: event.endedAt, snapshotUrl: event.snapshotUrl, clipUrl: event.clipUrl, metadatos: req.body },
          update: { finalizadoEn: event.endedAt, confianza: event.confidence, zona: event.zone, snapshotUrl: event.snapshotUrl, clipUrl: event.clipUrl, metadatos: req.body },
        })
      : await prisma.eventoCamara.create({ data: { empresaId: integration.empresaId, camaraId: camera.id, tipo: event.type, etiqueta: event.label, zona: event.zone, confianza: event.confidence, iniciadoEn: event.startedAt, finalizadoEn: event.endedAt, snapshotUrl: event.snapshotUrl, clipUrl: event.clipUrl, metadatos: req.body } });
    await prisma.integracionCamara.update({ where: { id: integration.id }, data: { estado: 'conectada', ultimoEventoEn: new Date(), ultimoError: null } });
    const config = integration.configuracion && typeof integration.configuracion === 'object' && !Array.isArray(integration.configuracion) ? integration.configuracion as Record<string, unknown> : {};
    const notify = Array.isArray(config.notificarTipos) ? config.notificarTipos.map(String) : ['persona', 'manipulacion', 'desconexion'];
    if (notify.includes(event.type)) void enviarPushAEmpresa(integration.empresaId, { title: `${event.type === 'persona' ? 'Persona detectada' : 'Alerta de cámara'} · ${camera.nombre}`, body: event.zone ? `Zona: ${event.zone}` : `Evento ${event.type} registrado.`, url: '#/camaras', severity: event.type === 'manipulacion' || event.type === 'desconexion' ? 'critical' : 'warning', tag: `camara-${camera.id}` }, ['admin', 'jefatura', 'mantenimiento']);
    res.status(202).json({ ok: true, eventoId: created.id, camaraId: camera.id });
  } catch (error) { next(error); }
});
