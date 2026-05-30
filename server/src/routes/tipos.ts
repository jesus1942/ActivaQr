import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/tipos
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const tipos = await prisma.tipoActivo.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
    res.json(tipos);
  } catch (err) {
    next(err);
  }
});

// GET /api/tipos/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const tipo = await prisma.tipoActivo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!tipo) return res.status(404).json({ error: 'Tipo de activo no encontrado' });
    res.json(tipo);
  } catch (err) {
    next(err);
  }
});

// POST /api/tipos
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      nombre,
      icono,
      mideTemperatura,
      mideAmperaje,
      midePresion,
      mideVibracion,
      activo,
    } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    const tipo = await prisma.tipoActivo.create({
      data: {
        empresaId,
        nombre,
        icono,
        mideTemperatura,
        mideAmperaje,
        midePresion,
        mideVibracion,
        activo,
      },
    });
    res.status(201).json(tipo);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tipos/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tipoActivo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Tipo de activo no encontrado' });

    const {
      nombre,
      icono,
      mideTemperatura,
      mideAmperaje,
      midePresion,
      mideVibracion,
      activo,
    } = req.body ?? {};
    const tipo = await prisma.tipoActivo.update({
      where: { id: req.params.id },
      data: {
        nombre,
        icono,
        mideTemperatura,
        mideAmperaje,
        midePresion,
        mideVibracion,
        activo,
      },
    });
    res.json(tipo);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tipos/:id  — soft-delete si está en uso, sino borra de verdad.
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tipoActivo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Tipo de activo no encontrado' });

    const enUso = await prisma.activo.count({ where: { tipoId: existing.id } });
    if (enUso > 0) {
      const tipo = await prisma.tipoActivo.update({
        where: { id: existing.id },
        data: { activo: false },
      });
      return res.json({ ok: true, softDeleted: true, tipo });
    }

    await prisma.tipoActivo.delete({ where: { id: existing.id } });
    res.json({ ok: true, softDeleted: false });
  } catch (err) {
    next(err);
  }
});

export default router;
