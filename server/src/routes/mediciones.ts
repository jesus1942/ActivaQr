import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/mediciones?activoId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const activoId =
      typeof req.query.activoId === 'string' ? req.query.activoId : undefined;

    const mediciones = await prisma.medicion.findMany({
      where: {
        ...(activoId ? { activoId } : {}),
        activo: { empresaId }, // garantiza aislamiento multi-tenant
      },
      include: { tecnico: true, fotos: true },
      orderBy: { fecha: 'desc' },
    });
    res.json(mediciones);
  } catch (err) {
    next(err);
  }
});

// POST /api/mediciones
// Al crear, escala el estado del activo:
//   medición urgente  -> activo critico
//   medición revision -> activo alerta (solo si estaba normal)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      activoId,
      tecnicoId,
      fecha,
      temperatura,
      amperaje,
      presion,
      vibracion,
      horasMarcha,
      estado,
      observaciones,
      origen,
      fotos,
    } = req.body ?? {};

    if (!activoId || typeof activoId !== 'string') {
      return res.status(400).json({ error: 'El campo "activoId" es obligatorio' });
    }

    const activo = await prisma.activo.findFirst({
      where: { id: activoId, empresaId },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const fotosCreate =
      Array.isArray(fotos) && fotos.length > 0
        ? {
            create: fotos
              .map((f: any) => (typeof f === 'string' ? f : f?.url))
              .filter((url: any) => typeof url === 'string' && url)
              .map((url: string) => ({ url })),
          }
        : undefined;

    const medicion = await prisma.medicion.create({
      data: {
        activoId,
        tecnicoId,
        fecha: fecha ? new Date(fecha) : undefined,
        temperatura,
        amperaje,
        presion,
        vibracion,
        horasMarcha,
        estado,
        observaciones,
        origen,
        ...(fotosCreate ? { fotos: fotosCreate } : {}),
      },
      include: { tecnico: true, fotos: true },
    });

    // Escalado de estado del activo según la medición.
    let nuevoEstado: typeof activo.estado | null = null;
    if (medicion.estado === 'urgente' && activo.estado !== 'critico') {
      nuevoEstado = 'critico';
    } else if (medicion.estado === 'revision' && activo.estado === 'normal') {
      nuevoEstado = 'alerta';
    }

    // Actualizar horas si la medición trae un valor mayor.
    const data: any = {};
    if (nuevoEstado) data.estado = nuevoEstado;
    if (
      typeof medicion.horasMarcha === 'number' &&
      medicion.horasMarcha > activo.horasActuales
    ) {
      data.horasActuales = medicion.horasMarcha;
    }
    if (Object.keys(data).length > 0) {
      await prisma.activo.update({ where: { id: activoId }, data });
    }

    res.status(201).json(medicion);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mediciones/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.medicion.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Medición no encontrada' });

    await prisma.medicion.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
