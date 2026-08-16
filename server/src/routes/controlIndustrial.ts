import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
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
import { AccionMotorEwelink, crearAutorizacionEwelink, ejecutarCanalEwelink, ejecutarMotorEwelink, sincronizarEwelink, verificarDisponibilidadEwelink } from '../ewelinkConnector';
import { enviarPushAUsuario } from '../push';
import { ejecutarCanalTuya, sincronizarTuya } from '../tuyaConnector';

const ESTADOS_MODULO = new Set(['configuracion', 'activo', 'suspendido']);
const PROVEEDORES = new Set(['sonoff_ewelink', 'tuya_cloud', 'milesight_ug65', 'webhook_generico']);
const OPERADORES = new Set(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']);
const SEVERIDADES = new Set(['informacion', 'advertencia', 'critica']);
const commandLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas maniobras en un minuto. Esperá antes de volver a operar.' },
});

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
  const provider = String((item as T & { proveedor?: string }).proveedor ?? '');
  const operable = provider === 'sonoff_ewelink' || provider === 'tuya_cloud';
  return { ...safe, credencialesConfiguradas: Boolean(credencialesCifradas), capacidades: { monitoreo: true, descubrimiento: operable, control: operable, escenas: operable } };
}

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function historyRange(query: Request['query']) {
  const hours = Math.min(24 * 31, Math.max(1, Number(query.horas) || 24));
  return { hours, since: new Date(Date.now() - hours * 3600_000) };
}

function booleanoEstricto(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function variableOperativaEwelink(clave: string) {
  return /^(switch_[1-4]|relay|online|operation_mode|motor_position|motor_state|active_timers|pulse_enabled(?:_[1-4])?|pulse_duration_ms(?:_[1-4])?)$/i.test(clave)
    || /^(current|voltage|actpow|power|apparentpow|reactpow|reactivepow|factor|daykwh|monthkwh|energy)(?:_[0-9]+)?$/i.test(clave)
    || /^(temperature|temperatura|humidity|humedad|pressure|presion|vibration|vibracion|door|puerta|window|contact|open|water|leak|flood|waterleak|motion|pir|movement|smoke|gas|co2)(?:_[0-9]+)?$/i.test(clave);
}

function umbralDeVariable(variable: { tipo: string }, value: unknown) {
  if (variable.tipo === 'numero') {
    const number = Number(value);
    if (!Number.isFinite(number)) throw statusError('El umbral numérico no es válido.');
    return { umbralNumero: number, umbralBooleano: null, umbralTexto: null };
  }
  if (variable.tipo === 'booleano') {
    const boolean = booleanoEstricto(value);
    if (boolean === null) throw statusError('Elegí si la condición debe estar activa o inactiva.');
    return { umbralNumero: null, umbralBooleano: boolean, umbralTexto: null };
  }
  return { umbralNumero: null, umbralBooleano: null, umbralTexto: String(value ?? '').slice(0, 500) };
}

type AccionEscena = { dispositivoId: string; canal: number; encendido: boolean };

function accionesEscena(value: unknown): AccionEscena[] {
  if (!Array.isArray(value) || !value.length || value.length > 16) throw statusError('Una escena debe tener entre 1 y 16 acciones.');
  const actions = value.map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw statusError('La escena contiene una acción inválida.');
    const item = raw as Record<string, unknown>;
    const dispositivoId = String(item.dispositivoId ?? '').trim();
    const canal = Number(item.canal);
    const encendido = booleanoEstricto(item.encendido);
    if (!dispositivoId || !Number.isInteger(canal) || canal < 0 || canal > 3 || encendido === null) throw statusError('Cada acción necesita dispositivo, canal y estado válidos.');
    return { dispositivoId, canal, encendido };
  });
  const unique = new Set(actions.map((item) => `${item.dispositivoId}:${item.canal}`));
  if (unique.size !== actions.length) throw statusError('Una escena no puede definir dos estados para el mismo canal.');
  return actions;
}

async function validarAccionesEscena(empresaId: string, actions: AccionEscena[]) {
  const devices = await prisma.dispositivoIoT.findMany({ where: { empresaId, archivadoEn: null, id: { in: [...new Set(actions.map((item) => item.dispositivoId))] } }, include: { integracion: true, variables: true } });
  if (devices.length !== new Set(actions.map((item) => item.dispositivoId)).size) throw statusError('La escena incluye un dispositivo que no pertenece a la empresa.', 400);
  for (const action of actions) {
    const device = devices.find((item) => item.id === action.dispositivoId)!;
    if (!device.permiteControl || !['sonoff_ewelink', 'tuya_cloud'].includes(device.integracion.proveedor) || device.tipo === 'puente_rf') throw statusError(`${device.nombre} no está habilitado para escenas.`);
    if (device.variables.some((item) => item.clave === 'operation_mode' && item.valorTexto === 'motor')) throw statusError(`${device.nombre} está en modo motor y no admite escenas de relé independientes.`);
    if (!device.variables.some((item) => item.clave === `switch_${action.canal + 1}` || (action.canal === 0 && item.clave === 'relay'))) throw statusError(`${device.nombre} no informó el canal ${action.canal + 1}.`);
  }
  return devices;
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

async function confirmarDisponibilidadFabricante(device: {
  nombre: string;
  estado: string;
  integracionId: string;
  identificadorExterno: string;
  integracion: { proveedor: string };
  variables: Array<{ clave: string; valorBooleano: boolean | null }>;
}) {
  const online = device.variables.find((item) => item.clave === 'online');
  const estadoGuardadoFueraDeLinea = online?.valorBooleano === false || device.estado === 'desconectado';
  // eWeLink es la fuente autoritativa. Se comprueba en cada maniobra para que
  // un offline viejo no bloquee y para preservar el estado real del otro canal.
  if (device.integracion.proveedor === 'sonoff_ewelink') {
    const current = await verificarDisponibilidadEwelink(device.integracionId, device.identificadorExterno);
    if (current.online) return current.estados;
    throw statusError(`${device.nombre} está desconectado de la nube del fabricante.`, 409);
  }
  if (!estadoGuardadoFueraDeLinea) return;
  throw statusError(`${device.nombre} está desconectado de la nube del fabricante.`, 409);
}

async function ejecutarReleSeguro(req: AuthRequest, params: { dispositivoId: string; canal: number; encendido: boolean; motivo: string }) {
  const empresaId = tenantId(req);
  let commandId: string | null = null;
  try {
    const [module, device] = await Promise.all([
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId } }),
      prisma.dispositivoIoT.findFirst({ where: { id: params.dispositivoId, empresaId, archivadoEn: null }, include: { integracion: true, variables: true } }),
    ]);
    if (!module?.controlRemotoHabilitado) throw statusError('El Superadmin no habilitó control remoto para este contrato.', 403);
    if (!device?.permiteControl) throw statusError('Este dispositivo está configurado sólo para monitoreo.', 409);
    if (!['sonoff_ewelink', 'tuya_cloud'].includes(device.integracion.proveedor)) throw statusError('Este equipo no posee un adaptador de operación remota.', 409);
    if (device.tipo === 'puente_rf') throw statusError('El RF Bridge es un puente de acceso y no se opera como una salida.', 409);
    const operationMode = device.variables.find((item) => item.clave === 'operation_mode')?.valorTexto;
    if (operationMode === 'motor') throw statusError('El Dual R3 está en modo motor. Por seguridad no admite mandos de relé independientes; usá Abrir, Detener o Cerrar.', 409);
    if (!Number.isInteger(params.canal) || params.canal < 0 || params.canal > 3 || typeof params.encendido !== 'boolean') throw statusError('Seleccioná un canal válido y el estado encendido o apagado.');
    const channelVariables = device.variables.filter((item) => /^switch_[1-4]$/.test(item.clave));
    if (channelVariables.length && !channelVariables.some((item) => item.clave === `switch_${params.canal + 1}`)) throw statusError('El dispositivo no informó ese canal.', 409);
    const estadosConfirmados = await confirmarDisponibilidadFabricante(device);
    const estados = estadosConfirmados ?? Object.fromEntries(channelVariables.map((item) => [Number(item.clave.slice(7)) - 1, Boolean(item.valorBooleano)]));
    const command = await prisma.comandoIoT.create({ data: {
      empresaId, dispositivoId: device.id, tipo: 'rele', payload: { canal: params.canal, encendido: params.encendido }, motivo: params.motivo.slice(0, 2000),
      solicitadoPorId: req.auth!.userId, solicitadoPorNombre: req.auth!.email,
      estado: 'pendiente', resultado: `Enviando operación segura mediante ${device.integracion.proveedor}.`,
    } });
    commandId = command.id;
    if (device.integracion.proveedor === 'sonoff_ewelink') {
      await ejecutarCanalEwelink(device.integracionId, device.identificadorExterno, params.canal, params.encendido, estados);
    } else {
      const tuyaCode = channelVariables.some((item) => item.clave === `switch_${params.canal + 1}`) ? `switch_${params.canal + 1}` : 'switch';
      await ejecutarCanalTuya(device.integracionId, device.identificadorExterno, tuyaCode, params.encendido);
    }
    const executed = await prisma.$transaction(async (tx) => {
      const variable = await tx.variableIoT.findUnique({ where: { dispositivoId_clave: { dispositivoId: device.id, clave: `switch_${params.canal + 1}` } } });
      if (variable) {
        await tx.variableIoT.update({ where: { id: variable.id }, data: { valorBooleano: params.encendido, valorNumero: null, valorTexto: null, tipo: 'booleano', calidad: 'buena', medidaEn: new Date() } });
        await tx.lecturaIoT.create({ data: { variableId: variable.id, valorBooleano: params.encendido, medidaEn: new Date(), calidad: 'buena' } });
      }
      return tx.comandoIoT.update({ where: { id: command.id }, data: { estado: 'ejecutado', ejecutadoEn: new Date(), resultado: `Canal ${params.canal + 1} ${params.encendido ? 'encendido' : 'apagado'} mediante ${device.integracion.proveedor}.` } });
    });
    await auditar(req, 'comando', 'ComandoIoT', command.id, `${device.nombre}: canal ${params.canal + 1} ${params.encendido ? 'encendido' : 'apagado'}. Motivo: ${params.motivo}`);
    return { ...executed, dispositivo: { nombre: device.nombre } };
  } catch (error) {
    if (commandId) await prisma.comandoIoT.update({ where: { id: commandId }, data: { estado: 'error', ejecutadoEn: new Date(), resultado: error instanceof Error ? error.message.slice(0, 2000) : 'Error desconocido al operar.' } }).catch(() => {});
    throw error;
  }
}

async function ejecutarMotorSeguro(req: AuthRequest, params: { dispositivoId: string; accion: AccionMotorEwelink; motivo: string }) {
  const empresaId = tenantId(req);
  let commandId: string | null = null;
  try {
    const [module, device] = await Promise.all([
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId } }),
      prisma.dispositivoIoT.findFirst({ where: { id: params.dispositivoId, empresaId, archivadoEn: null }, include: { integracion: true, variables: true } }),
    ]);
    if (!module?.controlRemotoHabilitado) throw statusError('El Superadmin no habilitó control remoto para este contrato.', 403);
    if (!device?.permiteControl) throw statusError('Este dispositivo está configurado sólo para monitoreo.', 409);
    if (device.integracion.proveedor !== 'sonoff_ewelink') throw statusError('El mando de motor está disponible únicamente para SONOFF eWeLink compatible.', 409);
    const operationMode = device.variables.find((item) => item.clave === 'operation_mode')?.valorTexto;
    if (operationMode !== 'motor') throw statusError('El equipo no confirmó que está en modo motor. La maniobra fue bloqueada.', 409);
    if (!(['abrir', 'detener', 'cerrar'] as string[]).includes(params.accion)) throw statusError('Seleccioná abrir, detener o cerrar.');
    await confirmarDisponibilidadFabricante(device);
    const command = await prisma.comandoIoT.create({ data: {
      empresaId, dispositivoId: device.id, tipo: 'motor', payload: { accion: params.accion }, motivo: params.motivo.slice(0, 2000),
      solicitadoPorId: req.auth!.userId, solicitadoPorNombre: req.auth!.email,
      estado: 'pendiente', resultado: 'Enviando maniobra segura mediante eWeLink.',
    } });
    commandId = command.id;
    await ejecutarMotorEwelink(device.integracionId, device.identificadorExterno, params.accion);
    const executed = await prisma.comandoIoT.update({ where: { id: command.id }, data: {
      estado: 'ejecutado', ejecutadoEn: new Date(), resultado: `Motor: ${params.accion} mediante eWeLink.`,
    } });
    await auditar(req, 'comando', 'ComandoIoT', command.id, `${device.nombre}: motor ${params.accion}. Motivo: ${params.motivo}`);
    return { ...executed, dispositivo: { nombre: device.nombre } };
  } catch (error) {
    if (commandId) await prisma.comandoIoT.update({ where: { id: commandId }, data: { estado: 'error', ejecutadoEn: new Date(), resultado: error instanceof Error ? error.message.slice(0, 2000) : 'Error desconocido al operar.' } }).catch(() => {});
    throw error;
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
        titulo: String(tableroConfig.titulo || '').trim().slice(0, 100),
        subtitulo: String(tableroConfig.subtitulo || '').trim().slice(0, 180),
        refreshSeconds: 5,
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

controlIndustrialRouter.patch('/tablero', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.moduloControlEmpresa.findUnique({ where: { empresaId } });
    if (!current) throw statusError('ActivaControl no está configurado para esta empresa.', 404);
    const incoming = req.body?.tableroConfig;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) throw statusError('La configuración del tablero no es válida.');
    const previous = current.tableroConfig && typeof current.tableroConfig === 'object' && !Array.isArray(current.tableroConfig)
      ? current.tableroConfig as Record<string, unknown>
      : {};
    const tableroConfig = {
      ...previous,
      titulo: String(incoming.titulo || '').trim().slice(0, 100),
      subtitulo: String(incoming.subtitulo || '').trim().slice(0, 180),
      refreshSeconds: 5,
      mostrarBateria: incoming.mostrarBateria !== false,
      mostrarSenal: incoming.mostrarSenal !== false,
    };
    const module = await prisma.moduloControlEmpresa.update({ where: { empresaId }, data: { tableroConfig } });
    await auditar(req, 'editar', 'ModuloControlEmpresa', module.id, 'Personalización del tablero ActivaControl actualizada.');
    res.json(module);
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/resumen', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const [module, integraciones, dispositivos, alarmas, comandos, reglas, escenas] = await Promise.all([
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId } }),
      prisma.integracionIoT.findMany({ where: { empresaId }, orderBy: { creadaEn: 'asc' } }),
      prisma.dispositivoIoT.findMany({ where: { empresaId, archivadoEn: null }, include: { integracion: { select: { proveedor: true } }, variables: { orderBy: { nombre: 'asc' } } }, orderBy: { nombre: 'asc' } }),
      prisma.alarmaIoT.findMany({ where: { empresaId, estado: { in: ['activa', 'reconocida'] }, dispositivo: { archivadoEn: null } }, include: { dispositivo: { select: { nombre: true } }, variable: { select: { nombre: true, unidad: true } } }, orderBy: { iniciadaEn: 'desc' }, take: 100 }),
      prisma.comandoIoT.findMany({ where: { empresaId }, include: { dispositivo: { select: { nombre: true } } }, orderBy: { solicitadoEn: 'desc' }, take: 25 }),
      prisma.reglaAlarmaIoT.findMany({ where: { empresaId, variable: { dispositivo: { archivadoEn: null } } }, include: { variable: { include: { dispositivo: { select: { nombre: true } } } } }, orderBy: { creadaEn: 'desc' } }),
      prisma.escenaIoT.findMany({ where: { empresaId }, orderBy: { creadaEn: 'desc' } }),
    ]);
    const publicDevices = dispositivos.map((device) => device.integracion.proveedor === 'sonoff_ewelink'
      ? { ...device, variables: device.variables.filter((variable) => variableOperativaEwelink(variable.clave)) }
      : device);
    res.json({ modulo: module, integraciones: integraciones.map(publicIntegration), dispositivos: publicDevices, alarmas, comandos, reglas, escenas });
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/energia/resumen', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const now = new Date();
    const currentStart = new Date(now.getTime() - 24 * 3600_000);
    const previousStart = new Date(now.getTime() - 48 * 3600_000);
    const variables = await prisma.variableIoT.findMany({
      where: { empresaId, dispositivo: { archivadoEn: null }, OR: [{ clave: { startsWith: 'actpow' } }, { clave: { startsWith: 'power' } }] },
      select: { id: true, clave: true, valorNumero: true, dispositivo: { select: { id: true, nombre: true, modelo: true, variables: { where: { OR: [{ clave: { startsWith: 'switch_' } }, { clave: 'relay' }] }, select: { clave: true, valorBooleano: true } } } }, lecturas: { where: { medidaEn: { gte: previousStart } }, select: { valorNumero: true, medidaEn: true }, orderBy: { medidaEn: 'asc' } } },
    });
    const active = variables.filter((item) => item.clave.startsWith('actpow') || !variables.some((other) => other.dispositivo.id === item.dispositivo.id && other.clave.replace(/^actpow/, '') === item.clave.replace(/^power/, '') && other.clave.startsWith('actpow')));
    const sanePower = (value: number | null | undefined, dualR3: boolean) => value == null || !Number.isFinite(value) ? 0 : Math.min(3300, dualR3 ? Math.abs(value) : Math.max(0, value));
    const average = (values: number[], dualR3: boolean) => values.length ? values.reduce((sum, value) => sum + sanePower(value, dualR3), 0) / values.length : 0;
    const channelOf = (key: string) => {
      const suffix = key.match(/_([0-9]+)$/)?.[1];
      if (!suffix) return null;
      const numeric = Number(suffix);
      return suffix === '0' || (suffix.length > 1 && suffix.startsWith('0')) ? numeric + 1 : numeric;
    };
    const outputIsOn = (item: (typeof active)[number]) => {
      const channel = channelOf(item.clave);
      const states = item.dispositivo.variables;
      if (channel != null) return states.find((state) => state.clave === `switch_${channel}`)?.valorBooleano !== false;
      return states.length ? states.some((state) => state.valorBooleano === true) : true;
    };
    const isDualR3 = (item: (typeof active)[number]) => /dual\s*r3|dualr3|e32-2sw/i.test(item.dispositivo.modelo ?? '');
    const currentPowerW = active.reduce((sum, item) => sum + (outputIsOn(item) ? sanePower(item.valorNumero, isDualR3(item)) : 0), 0);
    const currentAverageW = active.reduce((sum, item) => sum + average(item.lecturas.filter((reading) => reading.medidaEn >= currentStart && reading.valorNumero != null).map((reading) => reading.valorNumero!), isDualR3(item)), 0);
    const previousAverageW = active.reduce((sum, item) => sum + average(item.lecturas.filter((reading) => reading.medidaEn < currentStart && reading.valorNumero != null).map((reading) => reading.valorNumero!), isDualR3(item)), 0);
    const variationPercent = previousAverageW > 0 ? ((currentAverageW - previousAverageW) / previousAverageW) * 100 : null;
    res.json({
      currentPowerW, currentAverageW, previousAverageW, variationPercent,
      estimatedKwh24h: currentAverageW * 24 / 1000,
      previousEstimatedKwh24h: previousAverageW * 24 / 1000,
      channelsMeasured: active.length,
    });
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
      configuracion: { autoDiscover: true, ...(proveedor === 'sonoff_ewelink' ? { pollingSeconds: 5 } : proveedor === 'tuya_cloud' ? { pollingSeconds: 30 } : {}), ...(configuracion && typeof configuracion === 'object' ? configuracion : {}) },
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

controlIndustrialRouter.post('/integraciones/:id/autorizar-sonoff', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId, proveedor: 'sonoff_ewelink' } });
    if (!current) throw statusError('Integración SONOFF no encontrada.', 404);
    const appId = String(req.body?.appId ?? '').trim();
    const appSecret = String(req.body?.appSecret ?? '').trim();
    if (!appId || !appSecret) throw statusError('Ingresá el APPID y el APP SECRET del proyecto eWeLink.');
    const pollingSeconds = Math.min(3600, Math.max(5, Number(req.body?.pollingSeconds) || 5));
    await prisma.integracionIoT.update({
      where: { id: current.id },
      data: {
        credencialesCifradas: cifrarCredenciales({ appId: appId.slice(0, 200), appSecret: appSecret.slice(0, 500) }),
        configuracion: { ...((current.configuracion as object) || {}), pollingSeconds, oauthAutorizado: false },
        estado: 'pendiente',
        ultimoError: null,
      },
    });
    const result = crearAutorizacionEwelink({ integrationId: current.id, empresaId, userId: req.auth!.userId, appId, appSecret });
    await auditar(req, 'editar', 'IntegracionIoT', current.id, 'Autorización OAuth de eWeLink iniciada.');
    res.json(result);
  } catch (error) { next(error); }
});

controlIndustrialRouter.put('/integraciones/:id/configurar-tuya', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId, proveedor: 'tuya_cloud' } });
    if (!current) throw statusError('Integración Tuya no encontrada.', 404);
    const clientId = String(req.body?.clientId ?? '').trim();
    const clientSecret = String(req.body?.clientSecret ?? '').trim();
    const userId = String(req.body?.userId ?? '').trim();
    const region = String(req.body?.region ?? 'us').trim();
    if (!clientId || !clientSecret || !userId || !['us', 'eu', 'cn', 'in'].includes(region)) throw statusError('Completá Access ID, Access Secret, UID y región válidos.');
    const pollingSeconds = Math.min(3600, Math.max(10, Number(req.body?.pollingSeconds) || 30));
    await prisma.integracionIoT.update({ where: { id: current.id }, data: {
      credencialesCifradas: cifrarCredenciales({ clientId: clientId.slice(0, 300), clientSecret: clientSecret.slice(0, 600), userId: userId.slice(0, 300), region }),
      configuracion: { ...((current.configuracion as object) || {}), pollingSeconds, cloudAutorizada: true },
      estado: 'configurada', ultimoError: null,
    } });
    const result = await sincronizarTuya(current.id);
    await auditar(req, 'editar', 'IntegracionIoT', current.id, `Tuya Cloud configurada: ${result.dispositivosImportados} dispositivos.`);
    res.json(result);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/integraciones/:id/webhook-token', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId, proveedor: { in: ['milesight_ug65', 'webhook_generico'] } } });
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

controlIndustrialRouter.post('/integraciones/:id/sincronizar-tuya', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.integracionIoT.findFirst({ where: { id: req.params.id, empresaId, proveedor: 'tuya_cloud' } });
    if (!current) throw statusError('Integración Tuya no encontrada.', 404);
    const result = await sincronizarTuya(current.id);
    await auditar(req, 'editar', 'IntegracionIoT', current.id, `Sincronización Tuya: ${result.dispositivosImportados} dispositivos.`);
    res.json(result);
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/dispositivos/retirados', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const devices = await prisma.dispositivoIoT.findMany({
      where: { empresaId, archivadoEn: { not: null } },
      include: { integracion: { select: { proveedor: true } }, variables: { orderBy: { nombre: 'asc' } } },
      orderBy: { archivadoEn: 'desc' },
    });
    res.json(devices);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/dispositivos/:id/retirar', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const device = await prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId }, include: { variables: { select: { id: true } } } });
    if (!device) throw statusError('Dispositivo no encontrado.', 404);
    if (device.archivadoEn) return res.json(device);
    const now = new Date();
    const variableIds = device.variables.map((variable) => variable.id);
    const scenes = await prisma.escenaIoT.findMany({ where: { empresaId, activa: true }, select: { id: true, acciones: true } });
    const affectedScenes = scenes.filter((scene) => Array.isArray(scene.acciones) && scene.acciones.some((action) => action && typeof action === 'object' && !Array.isArray(action) && (action as Record<string, unknown>).dispositivoId === device.id));
    const updated = await prisma.$transaction(async (tx) => {
      await tx.alarmaIoT.updateMany({
        where: { dispositivoId: device.id, estado: { in: ['activa', 'reconocida'] } },
        data: { estado: 'resuelta', resueltaEn: now, resolucion: 'Dispositivo retirado del tablero por el administrador.' },
      });
      if (variableIds.length) await tx.reglaAlarmaIoT.updateMany({ where: { variableId: { in: variableIds } }, data: { activa: false, condicionDesde: null } });
      if (affectedScenes.length) await tx.escenaIoT.updateMany({ where: { id: { in: affectedScenes.map((scene) => scene.id) } }, data: { activa: false } });
      return tx.dispositivoIoT.update({ where: { id: device.id }, data: {
        archivadoEn: now,
        archivadoPorId: req.auth!.userId,
        archivadoPorNombre: req.auth!.email,
        habilitado: false,
        permiteControl: false,
        estado: 'desconectado',
      } });
    });
    await auditar(req, 'eliminar', 'DispositivoIoT', device.id, `${device.nombre} fue retirado de ActivaControl. Se preservaron historial y auditoría.`);
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/dispositivos/:id/restaurar', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const [device, module, activeCount] = await Promise.all([
      prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId, archivadoEn: { not: null } } }),
      prisma.moduloControlEmpresa.findUnique({ where: { empresaId }, select: { limiteDispositivos: true } }),
      prisma.dispositivoIoT.count({ where: { empresaId, archivadoEn: null } }),
    ]);
    if (!device) throw statusError('Dispositivo retirado no encontrado.', 404);
    if (!module || activeCount >= module.limiteDispositivos) throw statusError('No hay cupo contratado para restaurar este dispositivo.', 409);
    const updated = await prisma.dispositivoIoT.update({ where: { id: device.id }, data: {
      archivadoEn: null,
      archivadoPorId: null,
      archivadoPorNombre: null,
      habilitado: true,
      permiteControl: false,
      estado: 'sin_datos',
    } });
    await auditar(req, 'editar', 'DispositivoIoT', device.id, `${device.nombre} fue restaurado. El control remoto permanece deshabilitado hasta nueva autorización.`);
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.delete('/dispositivos/:id', requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const device = await prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!device) throw statusError('Dispositivo no encontrado.', 404);
    if (!device.archivadoEn) throw statusError('Primero retiralo del tablero. La eliminación definitiva sólo está disponible para dispositivos retirados.', 409);
    if (String(req.body?.confirmar ?? '') !== device.nombre) throw statusError(`Escribí exactamente “${device.nombre}” para confirmar la eliminación definitiva.`, 400);
    await prisma.dispositivoIoT.delete({ where: { id: device.id } });
    await auditar(req, 'eliminar', 'DispositivoIoT', device.id, `${device.nombre} fue eliminado definitivamente junto con su telemetría, reglas, alarmas y comandos.`);
    res.status(204).end();
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/dispositivos/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const device = await prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId, archivadoEn: null }, include: { integracion: { select: { proveedor: true } } } });
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
    if (req.body?.permiteControl !== undefined) {
      const requested = Boolean(req.body.permiteControl);
      if (requested && !['sonoff_ewelink', 'tuya_cloud'].includes(device.integracion.proveedor)) throw statusError('Este conector no posee un adaptador certificado de control.', 409);
      data.permiteControl = requested;
    }
    const updated = await prisma.dispositivoIoT.update({ where: { id: device.id }, data });
    await auditar(req, 'editar', 'DispositivoIoT', device.id, 'Configuración del dispositivo actualizada.');
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/variables/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const variable = await prisma.variableIoT.findFirst({ where: { id: req.params.id, empresaId }, include: { dispositivo: { select: { nombre: true } } } });
    if (!variable) throw statusError('Canal o variable no encontrada.', 404);
    const data: { nombre?: string; uso?: string } = {};
    if (req.body?.nombre !== undefined) {
      const nombre = String(req.body.nombre).trim().slice(0, 160);
      if (!nombre) throw statusError('El nombre visible del canal es obligatorio.');
      data.nombre = nombre;
    }
    if (req.body?.uso !== undefined) {
      const uso = String(req.body.uso).trim().toLowerCase();
      if (!new Set(['carga', 'lampara', 'motor', 'ventilador', 'bomba', 'calefaccion', 'toma', 'otro']).has(uso)) throw statusError('Elegí un tipo de carga válido.');
      if (!/^switch_[1-4]$|^relay$/.test(variable.clave)) throw statusError('El tipo de carga sólo se configura en salidas operables.');
      data.uso = uso;
    }
    if (!Object.keys(data).length) throw statusError('No se recibió ningún cambio para el canal.');
    const updated = await prisma.variableIoT.update({ where: { id: variable.id }, data });
    await auditar(req, 'editar', 'VariableIoT', variable.id, `${variable.dispositivo.nombre}: canal ${updated.nombre}, uso ${updated.uso}.`);
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/variables/:id/historial', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const variable = await prisma.variableIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!variable) throw statusError('Variable no encontrada.', 404);
    const hours = Math.min(24 * 31, Math.max(1, Number(req.query.horas) || 24));
    const readings = await prisma.lecturaIoT.findMany({ where: { variableId: variable.id, medidaEn: { gte: new Date(Date.now() - hours * 3600_000) } }, orderBy: { medidaEn: 'desc' }, take: 5000 });
    res.json({ variable, lecturas: readings.reverse() });
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/variables/:id/historial.csv', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const variable = await prisma.variableIoT.findFirst({ where: { id: req.params.id, empresaId }, include: { dispositivo: { select: { nombre: true } } } });
    if (!variable) throw statusError('Canal o variable no encontrada.', 404);
    const { hours, since } = historyRange(req.query);
    const readings = await prisma.lecturaIoT.findMany({
      where: { variableId: variable.id, medidaEn: { gte: since } },
      orderBy: { medidaEn: 'desc' },
      take: 100_001,
    });
    const truncated = readings.length > 100_000;
    const rows = readings.slice(0, 100_000).reverse();
    const safeName = `${variable.dispositivo.nombre}-${variable.nombre}`.replace(/[^a-z0-9áéíóúñ_-]+/gi, '-').slice(0, 100);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="historial-${safeName}-${hours}h.csv"`);
    res.setHeader('X-ActivaQR-Truncated', String(truncated));
    const header = ['Fecha', 'Dispositivo', 'Canal o variable', 'Clave', 'Valor', 'Unidad', 'Calidad'];
    const lines = rows.map((item) => [
      item.medidaEn.toISOString(), variable.dispositivo.nombre, variable.nombre, variable.clave,
      item.valorNumero ?? item.valorBooleano ?? item.valorTexto ?? '', variable.unidad ?? '', item.calidad,
    ].map(csvCell).join(','));
    res.send(`\uFEFF${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`);
  } catch (error) { next(error); }
});

controlIndustrialRouter.get('/dispositivos/:id/historial.csv', async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const device = await prisma.dispositivoIoT.findFirst({ where: { id: req.params.id, empresaId }, select: { id: true, nombre: true } });
    if (!device) throw statusError('Dispositivo no encontrado.', 404);
    const { hours, since } = historyRange(req.query);
    const [readings, commands] = await Promise.all([
      prisma.lecturaIoT.findMany({
        where: { variable: { dispositivoId: device.id }, medidaEn: { gte: since } },
        include: { variable: { select: { nombre: true, clave: true, unidad: true } } },
        orderBy: { medidaEn: 'desc' }, take: 100_001,
      }),
      prisma.comandoIoT.findMany({ where: { dispositivoId: device.id, solicitadoEn: { gte: since } }, orderBy: { solicitadoEn: 'desc' }, take: 10_000 }),
    ]);
    const truncated = readings.length > 100_000;
    const events = [
      ...readings.slice(0, 100_000).map((item) => ({ fecha: item.medidaEn, tipo: 'Lectura', canal: item.variable.nombre, clave: item.variable.clave, valor: item.valorNumero ?? item.valorBooleano ?? item.valorTexto ?? '', unidad: item.variable.unidad ?? '', estado: item.calidad, detalle: '' })),
      ...commands.map((item) => ({ fecha: item.solicitadoEn, tipo: 'Maniobra', canal: `Canal ${Number((item.payload as Record<string, unknown>)?.canal ?? 0) + 1}`, clave: item.tipo, valor: (item.payload as Record<string, unknown>)?.encendido === true ? 'Encendido' : 'Apagado', unidad: '', estado: item.estado, detalle: `${item.solicitadoPorNombre}: ${item.motivo}${item.resultado ? ` · ${item.resultado}` : ''}` })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    const safeName = device.nombre.replace(/[^a-z0-9áéíóúñ_-]+/gi, '-').slice(0, 100);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="historial-${safeName}-${hours}h.csv"`);
    res.setHeader('X-ActivaQR-Truncated', String(truncated));
    const header = ['Fecha', 'Dispositivo', 'Tipo de evento', 'Canal o variable', 'Clave', 'Valor', 'Unidad', 'Estado', 'Detalle'];
    const lines = events.map((item) => [item.fecha.toISOString(), device.nombre, item.tipo, item.canal, item.clave, item.valor, item.unidad, item.estado, item.detalle].map(csvCell).join(','));
    res.send(`\uFEFF${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`);
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/reglas', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const { variableId, nombre, operador, umbral, demoraSegundos, severidad, notificarPush } = req.body ?? {};
    if (!nombre || !OPERADORES.has(operador) || !SEVERIDADES.has(severidad)) throw statusError('Completá nombre, operador y severidad válidos.');
    const variable = await prisma.variableIoT.findFirst({ where: { id: variableId, empresaId } });
    if (!variable) throw statusError('Variable no encontrada.', 404);
    const threshold = umbralDeVariable(variable, umbral);
    const rule = await prisma.reglaAlarmaIoT.create({ data: { empresaId, variableId, nombre: String(nombre).trim().slice(0, 160), operador, severidad, demoraSegundos: Math.min(86400, Math.max(0, Number(demoraSegundos) || 0)), notificarPush: notificarPush !== false, ...threshold } });
    await auditar(req, 'crear', 'ReglaAlarmaIoT', rule.id, rule.nombre);
    res.status(201).json(rule);
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/reglas/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.reglaAlarmaIoT.findFirst({ where: { id: req.params.id, empresaId }, include: { variable: true } });
    if (!current) throw statusError('Regla no encontrada.', 404);
    const data: Record<string, unknown> = {};
    if (req.body?.nombre !== undefined) data.nombre = String(req.body.nombre).trim().slice(0, 160);
    if (req.body?.operador !== undefined) {
      if (!OPERADORES.has(req.body.operador)) throw statusError('Operador inválido.');
      data.operador = req.body.operador;
      data.condicionDesde = null;
    }
    if (req.body?.severidad !== undefined) {
      if (!SEVERIDADES.has(req.body.severidad)) throw statusError('Severidad inválida.');
      data.severidad = req.body.severidad;
    }
    if (req.body?.umbral !== undefined) { Object.assign(data, umbralDeVariable(current.variable, req.body.umbral)); data.condicionDesde = null; }
    if (req.body?.demoraSegundos !== undefined) { data.demoraSegundos = Math.min(86400, Math.max(0, Number(req.body.demoraSegundos) || 0)); data.condicionDesde = null; }
    if (req.body?.notificarPush !== undefined) data.notificarPush = Boolean(req.body.notificarPush);
    if (req.body?.activa !== undefined) { data.activa = Boolean(req.body.activa); if (!data.activa) data.condicionDesde = null; }
    const updated = await prisma.reglaAlarmaIoT.update({ where: { id: current.id }, data });
    await auditar(req, 'editar', 'ReglaAlarmaIoT', updated.id, `${updated.nombre}: ${updated.activa ? 'activa' : 'pausada'}.`);
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.delete('/reglas/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.reglaAlarmaIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Regla no encontrada.', 404);
    await prisma.reglaAlarmaIoT.delete({ where: { id: current.id } });
    await auditar(req, 'eliminar', 'ReglaAlarmaIoT', current.id, current.nombre);
    res.status(204).end();
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/notificaciones/prueba', async (req: AuthRequest, res, next) => {
  try {
    const subscriptions = await prisma.pushSubscription.count({ where: { usuarioId: req.auth!.userId } });
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) throw statusError('Las notificaciones push no están configuradas en el servidor.', 503);
    if (!subscriptions) throw statusError('Este celular todavía no está suscripto. Activá las notificaciones primero.', 409);
    await enviarPushAUsuario(req.auth!.userId, { title: 'ActivaQR Control conectado', body: 'Las alarmas de sensores pueden llegar a este dispositivo.', url: '#/control-industrial' });
    res.json({ ok: true, suscripciones: subscriptions });
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/escenas', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const nombre = String(req.body?.nombre ?? '').trim().slice(0, 160);
    if (!nombre) throw statusError('Ingresá un nombre para la escena.');
    const actions = accionesEscena(req.body?.acciones);
    await validarAccionesEscena(empresaId, actions);
    const scene = await prisma.escenaIoT.create({ data: {
      empresaId,
      nombre,
      descripcion: String(req.body?.descripcion ?? '').trim().slice(0, 2000) || null,
      acciones: actions as unknown as Prisma.InputJsonValue,
      creadaPorId: req.auth!.userId,
      creadaPorNombre: req.auth!.email,
    } });
    await auditar(req, 'crear', 'EscenaIoT', scene.id, `${scene.nombre}: ${actions.length} acciones.`);
    res.status(201).json(scene);
  } catch (error) { next(error); }
});

controlIndustrialRouter.patch('/escenas/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.escenaIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Escena no encontrada.', 404);
    const data: Record<string, unknown> = {};
    if (req.body?.nombre !== undefined) data.nombre = String(req.body.nombre).trim().slice(0, 160);
    if (req.body?.descripcion !== undefined) data.descripcion = String(req.body.descripcion).trim().slice(0, 2000) || null;
    if (req.body?.activa !== undefined) data.activa = Boolean(req.body.activa);
    if (req.body?.acciones !== undefined) {
      const actions = accionesEscena(req.body.acciones);
      await validarAccionesEscena(empresaId, actions);
      data.acciones = actions as unknown as Prisma.InputJsonValue;
    }
    const updated = await prisma.escenaIoT.update({ where: { id: current.id }, data });
    await auditar(req, 'editar', 'EscenaIoT', updated.id, `${updated.nombre}: ${updated.activa ? 'activa' : 'pausada'}.`);
    res.json(updated);
  } catch (error) { next(error); }
});

controlIndustrialRouter.delete('/escenas/:id', requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const current = await prisma.escenaIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!current) throw statusError('Escena no encontrada.', 404);
    await prisma.escenaIoT.delete({ where: { id: current.id } });
    await auditar(req, 'eliminar', 'EscenaIoT', current.id, current.nombre);
    res.status(204).end();
  } catch (error) { next(error); }
});

controlIndustrialRouter.post('/escenas/:id/ejecutar', commandLimiter, requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const empresaId = tenantId(req);
    const scene = await prisma.escenaIoT.findFirst({ where: { id: req.params.id, empresaId } });
    if (!scene) throw statusError('Escena no encontrada.', 404);
    if (!scene.activa) throw statusError('La escena está pausada.', 409);
    const actions = accionesEscena(scene.acciones);
    await validarAccionesEscena(empresaId, actions);
    const results = [];
    try {
      for (const action of actions) {
        results.push(await ejecutarReleSeguro(req, { ...action, motivo: `Escena “${scene.nombre}” confirmada desde ActivaQR.` }));
      }
      await prisma.escenaIoT.update({ where: { id: scene.id }, data: { ultimaEjecucionEn: new Date(), ultimaEjecucionEstado: 'ejecutada' } });
      await auditar(req, 'comando', 'EscenaIoT', scene.id, `${scene.nombre}: ${results.length} acciones ejecutadas.`);
      res.json({ ok: true, accionesEjecutadas: results.length, resultados: results });
    } catch (error) {
      await prisma.escenaIoT.update({ where: { id: scene.id }, data: { ultimaEjecucionEn: new Date(), ultimaEjecucionEstado: `error tras ${results.length} acciones` } });
      throw error;
    }
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

controlIndustrialRouter.post('/comandos', commandLimiter, requireJefatura, async (req: AuthRequest, res, next) => {
  try {
    const { dispositivoId, tipo, payload, motivo } = req.body ?? {};
    if (typeof dispositivoId !== 'string' || !payload || typeof payload !== 'object' || Array.isArray(payload) || !motivo || String(motivo).trim().length < 5) throw statusError('El comando requiere dispositivo, parámetros y un motivo de al menos 5 caracteres.');
    if (tipo === 'motor') {
      const accion = String((payload as Record<string, unknown>).accion) as AccionMotorEwelink;
      if (!['abrir', 'detener', 'cerrar'].includes(accion)) throw statusError('Seleccioná abrir, detener o cerrar.');
      return res.json(await ejecutarMotorSeguro(req, { dispositivoId, accion, motivo: String(motivo).trim() }));
    }
    if (tipo !== 'rele') throw statusError('Tipo de comando no permitido.');
    const canal = Number((payload as Record<string, unknown>).canal);
    const encendido = (payload as Record<string, unknown>).encendido;
    if (!Number.isInteger(canal) || canal < 0 || canal > 3 || typeof encendido !== 'boolean') throw statusError('Seleccioná un canal válido y el estado encendido o apagado.');
    res.json(await ejecutarReleSeguro(req, { dispositivoId, canal, encendido, motivo: String(motivo).trim() }));
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
