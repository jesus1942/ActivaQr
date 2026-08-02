import { randomUUID } from 'node:crypto';
import { Router, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import {
  AuthRequest,
  requireAdmin,
  requireAuth,
  requireAuthAndActiveEmpresa,
  requireSuperadmin,
} from '../auth';
import { registrarAuditoria } from '../auditoria';
import { enviarPushAEmpresa, enviarPushASuperadmin } from '../push';
import { APP_URL } from '../urls';
import {
  calcularPropuestaCorrectiva,
  puedeEjecutarse,
  validarTransicionOrden,
  type EstadoOrden,
  type EstadoPermiso,
  type NivelAlerta,
} from '../correctivosCore';
import { numeroDocumento } from '../correctivosService';

const incluirAlerta = {
  empresa: { select: { id: true, nombre: true } },
  activo: { select: { id: true, codigo: true, nombre: true, estado: true, estadoOperativo: true } },
  medicion: {
    select: {
      id: true, fecha: true, temperatura: true, amperaje: true, presion: true,
      vibracion: true, voltaje: true, porcentajeBateria: true, nivelToner: true,
      estado: true, observaciones: true,
    },
  },
  cotizacion: {
    select: { id: true, numero: true, estado: true, total: true, vigenciaHasta: true },
  },
  orden: true,
};

function texto(valor: unknown, maximo: number): string {
  return typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
}

function nivelPropuesto(actual: NivelAlerta, entrada: unknown): NivelAlerta {
  const niveles: Record<NivelAlerta, number> = { desmejorado: 1, riesgo: 2, critico: 3 };
  const solicitado = typeof entrada === 'string' && entrada in niveles
    ? entrada as NivelAlerta
    : actual;
  return niveles[solicitado] >= niveles[actual] ? solicitado : actual;
}

async function nombreUsuario(id: string): Promise<string> {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { nombre: true } });
  return usuario?.nombre ?? 'Administrador de la empresa';
}

export const adminCorrectivosRouter = Router();
adminCorrectivosRouter.use(requireAuth, requireSuperadmin);

adminCorrectivosRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = typeof req.query.empresaId === 'string' ? req.query.empresaId : undefined;
    const alertas = await prisma.alertaTecnica.findMany({
      where: empresaId ? { empresaId } : undefined,
      include: incluirAlerta,
      orderBy: { creadaEn: 'desc' },
    });
    res.json(alertas);
  } catch (error) { next(error); }
});

adminCorrectivosRouter.post('/:id/propuesta', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const alerta = await prisma.alertaTecnica.findUnique({
      where: { id: req.params.id },
      include: {
        activo: { select: { id: true, codigo: true, nombre: true } },
        empresa: {
          include: {
            usuarios: {
              where: { rol: 'admin', activo: true },
              select: { id: true, nombre: true, email: true, telefono: true },
            },
          },
        },
        cotizacion: { select: { id: true } },
      },
    });
    if (!alerta) return res.status(404).json({ error: 'Alerta técnica no encontrada.' });
    if (alerta.cotizacion) {
      return res.status(409).json({ error: 'Esta alerta ya tiene una cotización asociada.' });
    }
    if (!['abierta', 'riesgo_aceptado'].includes(alerta.estado)) {
      return res.status(409).json({ error: 'La alerta no admite una nueva propuesta en su estado actual.' });
    }

    const propuesta = calcularPropuestaCorrectiva(req.body ?? {});
    const nivel = nivelPropuesto(alerta.nivel as NivelAlerta, req.body?.nivel);
    const hallazgo = texto(req.body?.hallazgo, 4_000) || alerta.hallazgo;
    const riesgo = texto(req.body?.riesgo, 4_000) || alerta.riesgo;
    const recomendacion = texto(req.body?.recomendacion, 4_000) || alerta.recomendacion;
    const recomiendaDetencion = nivel === 'critico' || req.body?.recomiendaDetencion === true;
    const ahora = new Date();
    const id = randomUUID();
    const contacto = alerta.empresa.usuarios[0] ?? null;
    const vigenciaHasta = new Date(ahora.getTime() + propuesta.vigenciaDias * 86_400_000);
    const detalle = {
      ...propuesta,
      alertaNumero: alerta.numero,
      activoId: alerta.activo.id,
      activoCodigo: alerta.activo.codigo,
      activoNombre: alerta.activo.nombre,
      nivel,
      hallazgo,
      riesgo,
      recomendacion,
      recomiendaDetencion,
    };

    const [, cotizacion] = await prisma.$transaction([
      prisma.alertaTecnica.update({
        where: { id: alerta.id },
        data: {
          nivel, hallazgo, riesgo, recomendacion, recomiendaDetencion,
          estado: 'propuesta_emitida',
        },
      }),
      prisma.cotizacion.create({
        data: {
          id,
          numero: numeroDocumento('AQ', id, ahora),
          empresaId: alerta.empresaId,
          clienteNombre: alerta.empresa.nombre,
          contactoNombre: contacto?.nombre ?? null,
          contactoEmail: contacto?.email ?? null,
          contactoTelefono: contacto?.telefono ?? null,
          concepto: `Trabajo correctivo · ${alerta.activo.codigo} · ${alerta.activo.nombre}`,
          planSoftware: 'no_aplica',
          tipo: 'correctivo',
          alertaTecnicaId: alerta.id,
          detalle: detalle as unknown as Prisma.InputJsonValue,
          moneda: 'ARS',
          subtotal: propuesta.subtotal,
          descuento: propuesta.descuento,
          total: propuesta.total,
          vigenciaHasta,
          creadaPorId: req.auth!.userId,
          creadaPorNombre: req.auth!.email,
        },
      }),
    ]);

    void registrarAuditoria({
      empresaId: alerta.empresaId,
      usuarioId: req.auth!.userId,
      usuarioNombre: req.auth!.email,
      usuarioRol: 'superadmin',
      accion: 'crear',
      entidad: 'propuesta_correctiva',
      entidadId: cotizacion.id,
      detalle: `${alerta.numero} → ${cotizacion.numero}; sin autorización de ejecución`,
    });
    enviarPushAEmpresa(alerta.empresaId, {
      title: `Propuesta correctiva ${cotizacion.numero}`,
      body: `${alerta.activo.codigo} · requiere decisión del administrador`,
      url: `${APP_URL}/#/cotizaciones?cotizacion=${cotizacion.id}`,
    }, ['admin']).catch(() => {});
    res.status(201).json({ ok: true, cotizacionId: cotizacion.id, numero: cotizacion.numero });
  } catch (error) {
    if (error instanceof Error && /obligatorio|debe|importe|vigencia|plazo/i.test(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

adminCorrectivosRouter.post('/ordenes/:id/estado', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orden = await prisma.ordenTrabajoCorrectiva.findUnique({
      where: { id: req.params.id },
      include: { alerta: true, activo: { select: { codigo: true, nombre: true } } },
    });
    if (!orden) return res.status(404).json({ error: 'Orden de trabajo no encontrada.' });
    const accion = texto(req.body?.accion, 24);
    const siguiente: Record<string, EstadoOrden> = {
      programar: 'programada', iniciar: 'en_progreso', completar: 'completada', cancelar: 'cancelada',
    };
    const nuevoEstado = siguiente[accion];
    if (!nuevoEstado) return res.status(400).json({ error: 'Acción de orden no válida.' });
    validarTransicionOrden(orden.estado as EstadoOrden, nuevoEstado);

    let estadoPermiso = orden.estadoPermiso as EstadoPermiso;
    if (
      estadoPermiso === 'aprobado'
      && orden.permisoValidoHasta
      && orden.permisoValidoHasta.getTime() < Date.now()
    ) {
      await prisma.ordenTrabajoCorrectiva.update({
        where: { id: orden.id }, data: { estadoPermiso: 'vencido' },
      });
      estadoPermiso = 'vencido';
    }
    if (['programada', 'en_progreso'].includes(nuevoEstado) && !puedeEjecutarse(orden.estado as EstadoOrden, estadoPermiso)) {
      return res.status(409).json({
        error: 'La orden no puede ejecutarse hasta que el permiso de trabajo esté aprobado y vigente.',
      });
    }
    if (
      nuevoEstado === 'en_progreso'
      && orden.permisoValidoDesde
      && orden.permisoValidoDesde.getTime() > Date.now()
    ) {
      return res.status(409).json({ error: 'El permiso de trabajo todavía no está vigente.' });
    }

    const data: Prisma.OrdenTrabajoCorrectivaUpdateInput = { estado: nuevoEstado };
    if (nuevoEstado === 'programada') {
      const programadaPara = req.body?.programadaPara ? new Date(req.body.programadaPara) : null;
      if (!programadaPara || Number.isNaN(programadaPara.getTime())) {
        return res.status(400).json({ error: 'Indicá la fecha programada.' });
      }
      if (
        orden.estadoPermiso === 'aprobado'
        && (
          (orden.permisoValidoDesde && programadaPara < orden.permisoValidoDesde)
          || (orden.permisoValidoHasta && programadaPara > orden.permisoValidoHasta)
        )
      ) {
        return res.status(409).json({ error: 'La fecha programada debe quedar dentro de la vigencia del permiso.' });
      }
      data.programadaPara = programadaPara;
      data.responsableNombre = texto(req.body?.responsableNombre, 160) || null;
    }
    if (nuevoEstado === 'en_progreso') data.iniciadaEn = new Date();
    if (nuevoEstado === 'completada') {
      const cierreTrabajo = texto(req.body?.cierreTrabajo, 6_000);
      if (!cierreTrabajo) return res.status(400).json({ error: 'Documentá el trabajo realizado antes de cerrar.' });
      const horasTrabajo = Number(req.body?.horasTrabajo ?? 0);
      if (!Number.isFinite(horasTrabajo) || horasTrabajo < 0 || horasTrabajo > 10_000) {
        return res.status(400).json({ error: 'Las horas de trabajo no son válidas.' });
      }
      const evidencias = Array.isArray(req.body?.evidencias)
        ? req.body.evidencias.filter((item: unknown) => typeof item === 'string').slice(0, 6)
        : [];
      data.finalizadaEn = new Date();
      data.cierreTrabajo = cierreTrabajo;
      data.repuestosUtilizados = texto(req.body?.repuestosUtilizados, 6_000) || null;
      data.horasTrabajo = horasTrabajo;
      data.evidencias = evidencias as Prisma.InputJsonValue;
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const resultado = await tx.ordenTrabajoCorrectiva.update({ where: { id: orden.id }, data });
      if (nuevoEstado === 'completada') {
        await tx.alertaTecnica.update({ where: { id: orden.alertaId }, data: { estado: 'cerrada' } });
      }
      return resultado;
    });
    void registrarAuditoria({
      empresaId: orden.empresaId,
      usuarioId: req.auth!.userId,
      usuarioNombre: req.auth!.email,
      usuarioRol: 'superadmin',
      accion: nuevoEstado === 'completada' ? 'cerrar' : 'editar',
      entidad: 'orden_correctiva',
      entidadId: orden.id,
      detalle: `${orden.numero} · ${orden.activo.codigo} → ${nuevoEstado}`,
    });
    enviarPushAEmpresa(orden.empresaId, {
      title: `${orden.numero} · ${nuevoEstado.replace('_', ' ')}`,
      body: `${orden.activo.codigo} · ${orden.activo.nombre}`,
      url: '#/correctivos',
    }, ['admin']).catch(() => {});
    res.json(actualizada);
  } catch (error) {
    if (error instanceof Error && /No se puede/.test(error.message)) {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

export const clienteCorrectivosRouter = Router();
clienteCorrectivosRouter.use(requireAuthAndActiveEmpresa, requireAdmin);

clienteCorrectivosRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId!;
    const alertas = await prisma.alertaTecnica.findMany({
      where: { empresaId },
      include: incluirAlerta,
      orderBy: { creadaEn: 'desc' },
    });
    res.json(alertas);
  } catch (error) { next(error); }
});

clienteCorrectivosRouter.post('/:id/decision-operativa', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId!;
    const decision = texto(req.body?.decision, 40);
    if (!['detener_aislar', 'continuar_operando'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión operativa no válida.' });
    }
    const alerta = await prisma.alertaTecnica.findFirst({ where: { id: req.params.id, empresaId } });
    if (!alerta) return res.status(404).json({ error: 'Alerta técnica no encontrada.' });
    if (alerta.estado === 'cerrada') return res.status(409).json({ error: 'La alerta ya está cerrada.' });
    const detalle = texto(req.body?.detalle, 4_000);
    if (decision === 'continuar_operando' && !detalle) {
      return res.status(400).json({ error: 'Documentá el motivo y las condiciones para continuar operando.' });
    }
    const nombre = await nombreUsuario(req.auth!.userId);
    const actualizada = await prisma.alertaTecnica.update({
      where: { id: alerta.id },
      data: {
        decisionCliente: decision,
        decisionDetalle: detalle || null,
        decisionPorId: req.auth!.userId,
        decisionPorNombre: nombre,
        decisionEn: new Date(),
        ...(decision === 'continuar_operando' && alerta.estado === 'abierta'
          ? { estado: 'riesgo_aceptado' as const }
          : {}),
      },
    });
    void registrarAuditoria({
      empresaId, usuarioId: req.auth!.userId, usuarioNombre: nombre, usuarioRol: 'admin',
      accion: 'editar', entidad: 'alerta_tecnica', entidadId: alerta.id,
      detalle: `${alerta.numero}: ${decision}${detalle ? ` · ${detalle}` : ''}`,
    });
    enviarPushASuperadmin({
      title: `${alerta.numero} · decisión del cliente`, body: `${nombre}: ${decision.replace('_', ' ')}`,
      url: `${APP_URL}/#/correctivos?alerta=${alerta.id}`,
    }).catch(() => {});
    res.json(actualizada);
  } catch (error) { next(error); }
});

clienteCorrectivosRouter.post('/ordenes/:id/permiso', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId!;
    const decision = texto(req.body?.decision, 16);
    if (!['aprobar', 'rechazar'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión de permiso no válida.' });
    }
    const orden = await prisma.ordenTrabajoCorrectiva.findFirst({ where: { id: req.params.id, empresaId } });
    if (!orden) return res.status(404).json({ error: 'Orden de trabajo no encontrada.' });
    if (!orden.requierePermiso) return res.status(409).json({ error: 'Esta orden no requiere permiso adicional.' });
    if (['completada', 'cancelada'].includes(orden.estado)) {
      return res.status(409).json({ error: 'La orden ya no admite cambios de permiso.' });
    }
    const nombre = await nombreUsuario(req.auth!.userId);
    const condiciones = texto(req.body?.condiciones, 6_000);
    const validoDesde = req.body?.validoDesde ? new Date(req.body.validoDesde) : null;
    const validoHasta = req.body?.validoHasta ? new Date(req.body.validoHasta) : null;
    if (decision === 'aprobar') {
      if (!validoDesde || !validoHasta || Number.isNaN(validoDesde.getTime()) || Number.isNaN(validoHasta.getTime())) {
        return res.status(400).json({ error: 'Indicá desde cuándo y hasta cuándo rige el permiso.' });
      }
      if (validoHasta <= validoDesde) return res.status(400).json({ error: 'La vigencia final debe ser posterior a la inicial.' });
    }
    const actualizada = await prisma.ordenTrabajoCorrectiva.update({
      where: { id: orden.id },
      data: {
        estadoPermiso: decision === 'aprobar' ? 'aprobado' : 'rechazado',
        permisoCondiciones: condiciones || null,
        permisoValidoDesde: decision === 'aprobar' ? validoDesde : null,
        permisoValidoHasta: decision === 'aprobar' ? validoHasta : null,
        permisoAprobadoPorId: req.auth!.userId,
        permisoAprobadoPorNombre: nombre,
        permisoAprobadoEn: new Date(),
      },
    });
    void registrarAuditoria({
      empresaId, usuarioId: req.auth!.userId, usuarioNombre: nombre, usuarioRol: 'admin',
      accion: 'editar', entidad: 'permiso_trabajo', entidadId: orden.id,
      detalle: `${orden.numero}: permiso ${decision === 'aprobar' ? 'aprobado' : 'rechazado'}`,
    });
    enviarPushASuperadmin({
      title: `${orden.numero} · permiso ${decision === 'aprobar' ? 'aprobado' : 'rechazado'}`,
      body: nombre, url: `${APP_URL}/#/correctivos`,
    }).catch(() => {});
    res.json(actualizada);
  } catch (error) { next(error); }
});

clienteCorrectivosRouter.post('/ordenes/:id/conformidad', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId!;
    const decision = texto(req.body?.decision, 16);
    if (!['conforme', 'observada'].includes(decision)) {
      return res.status(400).json({ error: 'Conformidad no válida.' });
    }
    const orden = await prisma.ordenTrabajoCorrectiva.findFirst({ where: { id: req.params.id, empresaId } });
    if (!orden) return res.status(404).json({ error: 'Orden de trabajo no encontrada.' });
    if (orden.estado !== 'completada') return res.status(409).json({ error: 'La orden todavía no fue completada.' });
    const detalle = texto(req.body?.detalle, 4_000);
    if (decision === 'observada' && !detalle) return res.status(400).json({ error: 'Detallá la observación.' });
    const nombre = await nombreUsuario(req.auth!.userId);
    const actualizada = await prisma.ordenTrabajoCorrectiva.update({
      where: { id: orden.id },
      data: {
        conformidadCliente: decision,
        conformidadDetalle: detalle || null,
        conformidadPorId: req.auth!.userId,
        conformidadPorNombre: nombre,
        conformidadEn: new Date(),
      },
    });
    enviarPushASuperadmin({
      title: `${orden.numero} · ${decision}`, body: detalle || nombre, url: `${APP_URL}/#/correctivos`,
    }).catch(() => {});
    res.json(actualizada);
  } catch (error) { next(error); }
});
