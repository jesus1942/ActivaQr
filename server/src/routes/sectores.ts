import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { requireAdmin } from '../auth';

const router = Router();

// GET /api/sectores
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const sectores = await prisma.sector.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
    res.json(sectores);
  } catch (err) {
    next(err);
  }
});

// GET /api/sectores/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const sector = await prisma.sector.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!sector) return res.status(404).json({ error: 'Sector no encontrado' });
    res.json(sector);
  } catch (err) {
    next(err);
  }
});

// POST /api/sectores
router.post('/', requireAdmin as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const { nombre, color, activo } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    const sector = await prisma.sector.create({
      data: { empresaId, nombre, color, activo },
    });
    res.status(201).json(sector);
  } catch (err) {
    next(err);
  }
});

// PUT /api/sectores/:id
router.put('/:id', requireAdmin as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.sector.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Sector no encontrado' });

    const { nombre, color, activo } = req.body ?? {};
    const sector = await prisma.sector.update({
      where: { id: req.params.id },
      data: { nombre, color, activo },
    });
    res.json(sector);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sectores/:id
// Soft-delete (activo=false) si tiene activos asociados; sino borra de verdad.
router.delete('/:id', requireAdmin as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.sector.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Sector no encontrado' });

    const enUso = await prisma.activo.count({ where: { sectorId: existing.id } });
    if (enUso > 0) {
      const sector = await prisma.sector.update({
        where: { id: existing.id },
        data: { activo: false },
      });
      return res.json({ ok: true, softDeleted: true, sector });
    }

    await prisma.sector.delete({ where: { id: existing.id } });
    res.json({ ok: true, softDeleted: false });
  } catch (err) {
    next(err);
  }
});

export default router;
