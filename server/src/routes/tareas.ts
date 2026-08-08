import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { auditar } from '../auditoria';
import { AuthRequest, requireGestionOperacion, requireJefatura, requireTrabajoCampo } from '../auth';
import { esTecnicoCampo } from '../rolePolicy';
import { siguienteCicloMantenimiento } from '../mantenimientoService';

const router = Router();

// Calcula el próximo número de orden de trabajo (correlativo por empresa).
async function proximoNumeroOT(empresaId: string): Promise<number> {
  const ultima = await prisma.tareaMantenimiento.findFirst({
    where: { activo: { empresaId }, numero: { not: null } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });
  return (ultima?.numero ?? 0) + 1;
}

// GET /api/tareas?activoId=&estado=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const auth = (req as AuthRequest).auth!;
    const activoId =
      typeof req.query.activoId === 'string' ? req.query.activoId : undefined;
    const estado =
      typeof req.query.estado === 'string' ? req.query.estado : undefined;

    const tareas = await prisma.tareaMantenimiento.findMany({
      where: {
        ...(activoId ? { activoId } : {}),
        ...(estado ? { estado: estado as any } : {}),
        ...(esTecnicoCampo(auth.rol) ? { responsableId: auth.userId } : {}),
        activo: { empresaId },
      },
      include: { responsable: { select: { id: true, nombre: true, cargo: true } }, activo: true },
      orderBy: { fechaProgramada: 'asc' },
    });
    res.json(tareas);
  } catch (err) {
    next(err);
  }
});

// POST /api/tareas
router.post('/', requireGestionOperacion as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      activoId,
      responsableId,
      tipo,
      prioridad,
      fechaProgramada,
      fechaRealizada,
      estado,
      observaciones,
      materiales,
      horasTrabajo,
      fotos,
    } = req.body ?? {};

    if (!activoId || !tipo || !fechaProgramada) {
      return res.status(400).json({
        error: 'Los campos "activoId", "tipo" y "fechaProgramada" son obligatorios',
      });
    }

    const activo = await prisma.activo.findFirst({
      where: { id: activoId, empresaId },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });
    const responsableValido = typeof responsableId === 'string' && responsableId
      ? await prisma.usuario.findFirst({ where: { id: responsableId, empresaId, activo: true }, select: { id: true } })
      : null;

    const numero = await proximoNumeroOT(empresaId);
    const tarea = await prisma.tareaMantenimiento.create({
      data: {
        activoId,
        responsableId: responsableValido?.id ?? null,
        numero,
        tipo,
        prioridad: ['baja', 'media', 'alta'].includes(prioridad) ? prioridad : 'media',
        fechaProgramada: new Date(fechaProgramada),
        fechaRealizada: fechaRealizada ? new Date(fechaRealizada) : null,
        estado,
        observaciones,
        materiales: materiales ?? null,
        horasTrabajo: typeof horasTrabajo === 'number' ? horasTrabajo : null,
        fotos: Array.isArray(fotos) ? fotos : undefined,
      },
      include: { responsable: { select: { id: true, nombre: true, cargo: true } } },
    });
    void auditar(req as AuthRequest, 'crear', 'orden_trabajo', tarea.id, `OT-${String(numero).padStart(5, '0')} en ${activo.codigo}`);
    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tareas/:id  — actualizar / completar
router.put('/:id', requireTrabajoCampo as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tareaMantenimiento.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
      include: { activo: true },
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    const auth = (req as AuthRequest).auth!;
    const esTecnico = esTecnicoCampo(auth.rol);
    if (esTecnico && existing.responsableId !== auth.userId) {
      return res.status(403).json({ error: 'Solo podés actualizar órdenes asignadas a tu usuario.' });
    }

    const {
      responsableId,
      tipo,
      prioridad,
      fechaProgramada,
      fechaRealizada,
      estado,
      observaciones,
      materiales,
      horasTrabajo,
      fotos,
    } = req.body ?? {};

    const data: any = esTecnico
      ? { estado, observaciones, materiales }
      : { responsableId, tipo, estado, observaciones, materiales };
    if (!esTecnico && responsableId !== undefined) {
      const responsableValido = typeof responsableId === 'string' && responsableId
        ? await prisma.usuario.findFirst({ where: { id: responsableId, empresaId, activo: true }, select: { id: true } })
        : null;
      data.responsableId = responsableValido?.id ?? null;
    }
    if (!esTecnico && ['baja', 'media', 'alta'].includes(prioridad)) data.prioridad = prioridad;
    if (typeof horasTrabajo === 'number') data.horasTrabajo = horasTrabajo;
    if (Array.isArray(fotos)) data.fotos = fotos;
    if (!esTecnico && fechaProgramada !== undefined) data.fechaProgramada = new Date(fechaProgramada);
    if (fechaRealizada !== undefined) {
      data.fechaRealizada = fechaRealizada ? new Date(fechaRealizada) : null;
    }

    // Si se marca como completada y no se pasó fecha, usar la actual.
    if (estado === 'completado' && fechaRealizada === undefined && !existing.fechaRealizada) {
      data.fechaRealizada = new Date();
      data.cerradaPor = (req as AuthRequest).auth?.email ?? null;
    }

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const tarea = await prisma.tareaMantenimiento.update({
      where: { id: req.params.id },
      data,
      include: { responsable: { select: { id: true, nombre: true, cargo: true } } },
    });
    const seCompletaAhora = estado === 'completado' && existing.estado !== 'completado';
    if (seCompletaAhora && /preventiv/i.test(tarea.tipo)) {
      const fechaCierre = tarea.fechaRealizada ?? new Date();
      const siguiente = siguienteCicloMantenimiento(existing.activo, fechaCierre);
      if (siguiente) {
        await prisma.activo.update({ where: { id: existing.activoId }, data: siguiente });
      }
    }
    const accion = estado === 'completado' ? 'cerrar' : 'editar';
    void auditar(req as AuthRequest, accion, 'orden_trabajo', tarea.id, tarea.numero ? `OT-${String(tarea.numero).padStart(5, '0')}` : tarea.tipo);
    res.json(tarea);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tareas/:id — solo admin (operador no puede borrar OTs)
router.delete('/:id', requireJefatura as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tareaMantenimiento.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    await prisma.tareaMantenimiento.delete({ where: { id: req.params.id } });
    void auditar(req as AuthRequest, 'eliminar', 'orden_trabajo', existing.id, existing.numero ? `OT-${String(existing.numero).padStart(5, '0')}` : existing.tipo);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
