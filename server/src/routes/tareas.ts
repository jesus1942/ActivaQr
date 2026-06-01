import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/tareas?activoId=&estado=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const activoId =
      typeof req.query.activoId === 'string' ? req.query.activoId : undefined;
    const estado =
      typeof req.query.estado === 'string' ? req.query.estado : undefined;

    const tareas = await prisma.tareaMantenimiento.findMany({
      where: {
        ...(activoId ? { activoId } : {}),
        ...(estado ? { estado: estado as any } : {}),
        activo: { empresaId },
      },
      include: { responsable: true, activo: true },
      orderBy: { fechaProgramada: 'asc' },
    });
    res.json(tareas);
  } catch (err) {
    next(err);
  }
});

// POST /api/tareas
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      activoId,
      responsableId,
      tipo,
      fechaProgramada,
      fechaRealizada,
      estado,
      observaciones,
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

    const tarea = await prisma.tareaMantenimiento.create({
      data: {
        activoId,
        responsableId,
        tipo,
        fechaProgramada: new Date(fechaProgramada),
        fechaRealizada: fechaRealizada ? new Date(fechaRealizada) : null,
        estado,
        observaciones,
      },
      include: { responsable: true },
    });
    res.status(201).json(tarea);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tareas/:id  — actualizar / completar
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tareaMantenimiento.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    const {
      responsableId,
      tipo,
      fechaProgramada,
      fechaRealizada,
      estado,
      observaciones,
    } = req.body ?? {};

    const data: any = { responsableId, tipo, estado, observaciones };
    if (fechaProgramada !== undefined) data.fechaProgramada = new Date(fechaProgramada);
    if (fechaRealizada !== undefined) {
      data.fechaRealizada = fechaRealizada ? new Date(fechaRealizada) : null;
    }

    // Si se marca como completada y no se pasó fecha, usar la actual.
    if (estado === 'completado' && fechaRealizada === undefined && !existing.fechaRealizada) {
      data.fechaRealizada = new Date();
    }

    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const tarea = await prisma.tareaMantenimiento.update({
      where: { id: req.params.id },
      data,
      include: { responsable: true },
    });
    res.json(tarea);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tareas/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tareaMantenimiento.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Tarea no encontrada' });

    await prisma.tareaMantenimiento.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
