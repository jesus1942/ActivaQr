import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/sedes  — filtrado por empresa
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const sedes = await prisma.sede.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
    res.json(sedes);
  } catch (err) {
    next(err);
  }
});

// GET /api/sedes/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const sede = await prisma.sede.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });
    res.json(sede);
  } catch (err) {
    next(err);
  }
});

// POST /api/sedes
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const { nombre, direccion, ciudad } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    const sede = await prisma.sede.create({
      data: { empresaId, nombre, direccion, ciudad },
    });
    res.status(201).json(sede);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sedes/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.sede.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Sede no encontrada' });

    const { nombre, direccion, ciudad } = req.body ?? {};
    const sede = await prisma.sede.update({
      where: { id: req.params.id },
      data: { nombre, direccion, ciudad },
    });
    res.json(sede);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sedes/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.sede.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Sede no encontrada' });

    await prisma.sede.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return res
        .status(400)
        .json({ error: 'No se puede borrar la sede porque tiene activos asociados' });
    }
    next(err);
  }
});

export default router;
