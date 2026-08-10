import { randomBytes } from 'crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { prisma } from '../prisma';
import {
  AuthRequest,
  requireAdmin,
  requireAuth,
  requireGestionOperacion,
  requireJefatura,
  requireSuperadmin,
} from '../auth';
import { auditar, registrarAuditoria } from '../auditoria';
import { cifrarCredenciales, hashToken } from '../iotSecrets';
import { normalizarEventoIoT, procesarEventoIoT } from '../iotIngest';
import { sincronizarEwelink } from '../ewelinkConnector';

const ESTADOS_MODULO = new Set(['configuracion', 'activo', 'suspendido']);
const PROVEEDORES = new Set(['sonoff_ewelink', 'milesight_ug65', 'webhook_generico']);
const OPERADORES = new Set(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']);
const SEVERIDADES = new Set(['informacion', 'advertencia', 'critica']);

function statusError(message: string, status = 400) {
  const error = new Error(message);
  (error as Error & { status?: number }).status = status;
  return error;
}

function tenantId(req: AuthRequest): string {
  if (!req.auth?.empresaId) throw statusError('La sesión no pertenece a una empresa.', 403);
  return req.auth.empresaId;
}

function publicIntegration<T extends { credencialesCifradas?: string | null }>(item: T) {
  const { credencialesCifradas, ...safe } = item;
  return { ...safe, credencialesConfiguradas: Boolean(credencialesCifradas) };
}

async function moduloActivo(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const module = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId: tenantId(req) } });
    if (!module || module.estado !== 'activo') {
      return res.status(403).json({ code: 'modulo_control_no_habilitado', error: 'ActivaQR Control no está habilitado para esta empresa.' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export const adminControlIndustrialRouter = Router();
adminControlIndustrialRouter.use(requireAuth, requireSuperadmin);

adminControlIndustrialRouter.get('/', async (_req, res, next) => {
  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true, nombre: true, plan: true, estado: true,
        moduloControl: true,
        _count: { select: { dispositivosIoT: true, integracionesIoT: true, alarmasIoT: true } },
      },
    });
    res.json(empresas);
  } catch (error) { next(error); }
});

adminControlIndustrialRouter.put('/:empresaId', async (req: AuthRequest, res, next) => {
  try {
    const { estado, nombreServicio, cargoImplementacionUsd, abonoMensualUsd, monedaFacturacion, limiteDispositivos, limiteGateways, retencionDias, umbralSinConexionMinutos, controlRemotoHabilitado, notasComerciales, tableroConfig } = req.body ?? {};
    if (!ESTADOS_MODULO.has(estado)) throw statusError('Estado de módulo inválido.');
    if (!Number.isInteger(Number(limiteDispositivos)) || Number(limiteDispositivos) < 1 || Number(limiteDispositivos) > 10000) throw statusError('El límite de dispositivos debe estar entre 1 y 10.000.');
    if (!Number.isInteger(Number(limiteGateways)) || Number(limiteGateways) < 1 || Number(limiteGateways) > 1000) throw statusError('El límite de gateways debe estar entre 1 y 1.000.');
    if (!Number.isInteger(Number(retencionDias)) || Number(retencionDias) < 7 || Number(retencionDias) > 3650) throw statusError('La retención debe estar entre 7 y 3.650 días.');
    if (!Number.isInteger(Number(umbralSinConexionMinutos)) || Number(umbralSinConexionMinutos) < 1 || Number(umbralSinConexionMinutos) > 1440) throw statusError('El umbral sin conexión debe estar entre 1 minuto y 24 horas.');
    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.empresaId }, select: { id: true, nombre: true } });
    if (!empresa) throw statusError('Empresa no encontrada.', 404);
    const data = {
      estado,
      nombreServicio: String(nombreServicio || 'ActivaQR Control').trim().slice(0, 100),
      cargoImplementacionUsd: cargoImplementacionUsd === '' || cargoImplementacionUsd == null ? null : Number(cargoImplementacionUsd),
      abonoMensualUsd: abonoMensualUsd === '' || abonoMensualUsd == null ? null : Number(abonoMensualUsd),
      monedaFacturacion: String(monedaFacturacion || 'USD').slice(0, 8),
      limiteDispositivos: Number(limiteDispositivos),
      limiteGateways: Number(limiteGateways),
      retencionDias: Number(retencionDias),
      umbralSinConexionMinutos: Number(umbralSinConexionMinutos),
      controlRemotoHabilitado: Boolean(controlRemotoHabilitado),
      notasComerciales: notasComerciales ? String(notasComerciales).slice(0, 5000) : null,
      tableroConfig: tableroConfig && typeof tableroConfig === 'object' ? {
        subtitulo: String(tableroConfig.subtitulo || '').trim().slice(0, 180),
        refreshSeconds: Math.min(300, Math.max(5, Number(tableroConfig.refreshSeconds) || 15)),
        mostrarBateria: tableroConfig.mostrarBateria !== false,
        mostrarSenal: tableroConfig.mostrarSenal !== false,
      } : undefined,
    };
    const module = await prisma.moduloControlEmpresa.upsert({
      where: { empresaId: empresa.id },
      create: { empresaId: empresa.id, habilitadoPorId: req.auth?.userId, ...data },
      update: data,
    });
    await registrarAuditoria({ empresaId: empresa.id, usuarioId: req.auth?.userId, usuarioNombre: req.auth?.email ?? 'Superadmin', usuarioRol: 'superadmin', accion: 'habilitar_modulo', entidad: 'ModuloControlEmpresa', entidadId: module.id, detalle: `${empresa.nombre}: ${estado}, ${data.limiteDispositivos} dispositivos, control remoto ${data.controlRemotoHabilitado ? 'habilitado' : 'bloqueado'}.` });
    res.json(module);
  } catch (error) { next(error); }
});

adminControlIndustrialRouter.get('/:empresaId/resumen', async (req, res, next) => {
  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id: req.params.empresaId },
      select: {
        id: true, nombre: true, moduloControl: true,
        integracionesIoT: { select: { id: true, nombre: true, proveedor: true, estado: true, ultimoEventoEn: true, ultimoError: true } },
        dispositivosIoT: { include: { variables: true }, orderBy: { nombre: 'asc' } },
        alarmasIoT: { where: { estado: { in: ['activa', 'reconocida'] } }, orderBy: { iniciadaEn: 'desc' }, take: 100 },
      },
    });
    if (!empresa) throw statusError('Empresa no encontrada.', 404);
    res.json(empresa);
  } catch (error) { next(error); }
});

export const controlIndustrialRouter = Router();
controlIndustrialRouter.use(requireAuth);

controlIndustrialRouter.get('/estado', async (req: AuthRequest, res, next) => {
  try {
    const module = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId: tenantId(req) } });
    res.json({ habilitado: module?.estado === 'activo', modulo: module });
  } catch (error) { next(error); }
});

controlIndustrialRouter.use(moduloActivo);

controlIndustrialRouter.get('/resumen', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const moduleState = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId } });
    const staleBefore = new Date(Date.now() - (moduleState?.umbralSinConexionMinutos ?? 10) * 60_000);
    await prisma.dispositivoIoT.updateMany({ where: { empresaId, habilitado: true, ultimoContactoEn: { not: null, lt: staleBefore } }, data: { estado: 'desconectado' } });
    const [module, integraciones, dispositivos, alarmas, comandos] = await Promise.all([
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId } }),
      prisma.integracionIoT.findMany({ where: { empresaId }, orderBy: { creadaEn: 'asc' } }),
      prisma.dispositivoIoT.findMany({ where: { empresaId }, include: { variables: { orderBy: { nombre: 'asc' } } }, orderBy: { nombre: 'asc' } }),
      prisma.alarmaIoT.findMany({ where: { empresaId, estado: { in: ['activa', 'reconocida'] } }, include: { dispositivo: { select: { nombre: true } }, variable: { select: { nombre: true, unidad: true } } }, orderBy: { iniciadaEn: 'desc' }, take: 100 }),
      prisma.comandoIoT.findMany({ where: { empresaId }, include: { dispositivo: { select: { nombre: true } } }, orderBy: { solicitadoEn: 'desc' }, take: 25 }),
    ]);
    res.json({ modulo: module, integraciones: integraciones.map(publicIntegration), dispositivos, alarmas, comandos });
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/integraciones', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const { nombre, proveedor, configuracion } = req.body ?? {};
    if (!nombre || !PROVEEDORES.has(proveedor)) throw statusError('Nombre y proveedor válido son obligatorios.');
    const module = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId } });
    const count = await prisma.integracionIoT.count({ where: { empresaId } });
    if (count >= (module?.limiteGateways ?? 0)) throw statusError('Se alcanzó el límite contratado de gateways o integraciones.', 409);
    const integration = await prisma.integracionIoT.create({ data: {
      empresaId,
      nombre: String(nombre).trim().slice(0, 120),
      proveedor,
      configuracion: { autoDiscover: true, ...(proveedor === 'sonoff_ewelink' ? { pollingSeconds: 300 } : {}), ...(configuracion && typeof configuracion === 'object' ? configuracion : {}) },
    } });
    await auditar(req, 'crear', 'IntegracionIoT', integration.id, `Conector ${proveedor}: ${integration.nombre}`);
    res.status(201).json(publicIntegration(integration));
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/integraciones/:id', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Integración no encontrada.', 404);
    const data: Record<string, unknown> = {};
    if (req.body?.nombre !== undefined) data.nombre = String(req.body.nombre).trim().slice(0, 120);
    if (req.body?.estado !== undefined) {
      if (!['pendiente', 'configurada', 'conectada', 'error', 'pausada'].includes(req.body.estado)) throw statusError('Estado inválido.');
      data.estado = req.body.estado;
    }
    if (req.body?.configuracion && typeof req.body.configuracion === 'object') data.configuracion = { ...(current.configuracion as object || {}), ...req.body.configuracion };
    const updated = await prisma.integracionIoT.update({ where: { id: current.id }, data });
    await auditar(req, 'editar', 'IntegracionIoT', updated.id, 'Configuración de integración actualizada.');
    res.json(publicIntegration(updated));
  } catch (error) { next(error); }
});

controlIndustrialRouter.put('/integraciones/:id/credenciales', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Integración no encontrada.', 404);
    const credentials = req.body?.credenciales;
    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) throw statusError('Ingresá las credenciales del conector.');
    const clean = Object.fromEntries(Object.entries(credentials).filter(([, value]) => typeof value === 'string' && value.trim()).map(([key, value]) => [key.slice(0, 80), String(value).trim().slice(0, 4000)]));
    if (current.proveedor === 'sonoff_ewelink' && (!clean.appId || !clean.appSecret || !clean.accessToken)) {
      throw statusError('SONOFF/eWeLink requiere App ID, App Secret y Access Token del proyecto de desarrollador.');
    }
    const updated = await prisma.integracionIoT.update({ where: { id: current.id }, data: { credencialesCifradas: cifrarCredenciales(clean), estado: 'configurada', ultimoError: null } });
    await auditar(req, 'editar', 'IntegracionIoT', updated.id, `Credenciales ${current.proveedor} reemplazadas de forma segura.`);
    res.json(publicIntegration(updated));
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/integraciones/:id/webhook-token', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Integración no encontrada.', 404);
    const token = randomBytes(32).toString('base64url');
    await prisma.integracionIoT.update({ where: { id: current.id }, data: { webhookTokenHash: hashToken(token), webhookTokenHint: token.slice(-6), estado: 'configurada' } });
    await auditar(req, 'editar', 'IntegracionIoT', current.id, 'Token de ingesta rotado. El anterior quedó invalidado.');
    res.json({ token, endpoint: `/api/iot/ingest/${token}`, advertencia: 'Copialo ahora. ActivaQR no vuelve a mostrar este token.' });
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/integraciones/:id/sincronizar-sonoff', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId, proveedor: 'sonoff_ewelink' } });
    if (!current) throw statusError('Integración SONOFF no encontrada.', 404);
    const result = await sincronizarEwelink(current.id);
    await auditar(req, 'editar', 'IntegracionIoT', current.id, `Sincronización SONOFF: ${result.dispositivosImportados} dispositivos.`);
    res.json(result);
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/dispositivos/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const device = await prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!device) throw statusError('Dispositivo no encontrado.', 404);
    const data: Record<string, unknown> = {};
    for (const field of ['nombre', 'ubicacion', 'modelo', 'tipo'] as const) if (req.body?.[field] !== undefined) data[field] = String(req.body[field]).trim().slice(0, 160) || null;
    if (req.body?.activoId !== undefined) {
      if (req.body.activoId) {
        const asset = await prisma.activo.findFirst({ where: { id: req.body.activoId, empresaId } });
        if (!asset) throw statusError('El activo asociado no pertenece a la empresa.', 400);
      }
      data.activoId = req.body.activoId || null;
    }
    if (req.body?.habilitado !== undefined) data.habilitado = Boolean(req.body.habilitado);
    if (req.body?.permiteControl !== undefined) data.permiteControl = Boolean(req.body.permiteControl);
    const updated = await prisma.dispositivoIoT.update({ where: { id: device.id }, data });
    await auditar(req, 'editar', 'DispositivoIoT', device.id, 'Configuración del dispositivo actualizada.');
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/variables/:id/historial', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const variable = await prisma.variableIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!variable) throw statusError('Variable no encontrada.', 404);
    const hours = Math.min(24 * 31, Math.max(1, Number(req.query.horas) || 24));
    const readings = await prisma.lecturaIoT.findMany({ where: { variableId: variable.id, medidaEn: { gte: new Date(Date.now() - hours * 3600_000) } }, orderBy: { medidaEn: 'asc' }, take: 5000 });
    res.json({ variable, lecturas: readings });
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/reglas', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const { variableId, nombre, operador, umbral, demoraSegundos, severidad, notificarPush } = req.body ?? {};
    if (!nombre || !OPERADORES.has(operador) || !SEVERIDADES.has(severidad)) throw statusError('Completá nombre, operador y severidad válidos.');
    const variable = await prisma.variableIoT.findFirst({ where: { id: variableId, empresaId } });
    if (!variable) throw statusError('Variable no encontrada.', 404);
    const threshold = variable.tipo === 'numero' ? { umbralNumero: Number(umbral) } : variable.tipo === 'booleano' ? { umbralBooleano: Boolean(umbral) } : { umbralTexto: String(umbral) };
    if (variable.tipo === 'numero' && !Number.isFinite((threshold as { umbralNumero: number }).umbralNumero)) throw statusError('El umbral numérico no es válido.');
    const rule = await prisma.reglaAlarmaIoT.create({ data: { empresaId, variableId, nombre: String(nombre).trim().slice(0, 160), operador, severidad, demoraSegundos: Math.min(86400, Math.max(0, Number(demoraSegundos) || 0)), notificarPush: notificarPush !== false, ...threshold } });
    await auditar(req, 'crear', 'ReglaAlarmaIoT', rule.id, rule.nombre);
    res.status(201).json(rule);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/alarmas/:id/reconocer', requireGestionOperacion, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const alarma = await prisma.alarmaIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!alarma) throw statusError('Alarma no encontrada.', 404);
    const updated = await prisma.alarmaIoT.update({ where: { id: alarma.id }, data: { estado: 'reconocida', reconocidaEn: new Date(), reconocidaPorId: req.auth?.userId, reconocidaPorNombre: req.auth?.email } });
    await auditar(req, 'alarma', 'AlarmaIoT', alarma.id, 'Alarma reconocida por el operador.');
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/comandos', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const { dispositivoId, tipo, payload, motivo } = req.body ?? {};
    if (!['rele', 'setpoint', 'salida', 'personalizado'].includes(tipo) || !payload || typeof payload !== 'object' || !motivo || String(motivo).trim().length < 5) throw statusError('El comando requiere dispositivo, tipo, valor y un motivo de al menos 5 caracteres.');
    const [module, device] = await Promise.all([
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId } }),
      prisma.dispositivoIoT.findFirst({ where: { id: dispositivoId, empresaId }, include: { integracion: true } }),
    ]);
    if (!module?.controlRemotoHabilitado) throw statusError('El Superadmin no habilitó control remoto para este contrato.', 403);
    if (!device?.permiteControl) throw statusError('Este dispositivo está configurado sólo para monitoreo.', 409);
    const command = await prisma.comandoIoT.create({ data: {
      empresaId, dispositivoId: device.id, tipo, payload, motivo: String(motivo).trim().slice(0, 2000),
      solicitadoPorId: req.auth!.userId, solicitadoPorNombre: req.auth!.email,
      estado: 'pendiente',
      resultado: 'Registrado. Falta un adaptador de ejecución certificado para el controlador asociado.',
    } });
    await auditar(req, 'comando', 'ComandoIoT', command.id, `${tipo}: ${motivo}`);
    res.status(202).json(command);
  } catch (error) { next(error); }
});

export const iotIngestRouter = Router();
iotIngestRouter.post('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await prisma.integracionIoT.findUnique({ where: { webhookTokenHash: hashToken(req.params.token) } });
    if (!integration) throw statusError('Token de ingesta inválido.', 401);
    if (integration.estado === 'pausada') throw statusError('Integración pausada.', 409);
    const result = await procesarEventoIoT(integration.id, normalizarEventoIoT(req.body));
    res.status(202).json(result);
  } catch (error) {
    if (req.params.token) {
      prisma.integracionIoT.updateMany({ where: { webhookTokenHash: hashToken(req.params.token) }, data: { ultimoError: error instanceof Error ? error.message.slice(0, 2000) : 'Error de ingesta', estado: 'error' } }).catch(() => {});
    }
    next(error);
  }
});
