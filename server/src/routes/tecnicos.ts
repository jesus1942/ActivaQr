import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/tecnicos
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const tecnicos = await prisma.tecnico.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
    res.json(tecnicos);
  } catch (err) {
    next(err);
  }
});

// GET /api/tecnicos/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const tecnico = await prisma.tecnico.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!tecnico) return res.status(404).json({ error: 'Técnico no encontrado' });
    res.json(tecnico);
  } catch (err) {
    next(err);
  }
});

// POST /api/tecnicos
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const { nombre, rol, email, telefono, activo } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    const tecnico = await prisma.tecnico.create({
      data: { empresaId, nombre, rol, email, telefono, activo },
    });
    res.status(201).json(tecnico);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tecnicos/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tecnico.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Técnico no encontrado' });

    const { nombre, rol, email, telefono, activo } = req.body ?? {};
    const tecnico = await prisma.tecnico.update({
      where: { id: req.params.id },
      data: { nombre, rol, email, telefono, activo },
    });
    res.json(tecnico);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tecnicos/:id  — soft-delete si está en uso, sino borra de verdad.
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.tecnico.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Técnico no encontrado' });

    const [activos, mediciones, tareas] = await Promise.all([
      prisma.activo.count({ where: { responsableId: existing.id } }),
      prisma.medicion.count({ where: { tecnicoId: existing.id } }),
      prisma.tareaMantenimiento.count({ where: { responsableId: existing.id } }),
    ]);

    if (activos + mediciones + tareas > 0) {
      const tecnico = await prisma.tecnico.update({
        where: { id: existing.id },
        data: { activo: false },
      });
      return res.json({ ok: true, softDeleted: true, tecnico });
    }

    await prisma.tecnico.delete({ where: { id: existing.id } });
    res.json({ ok: true, softDeleted: false });
  } catch (err) {
    next(err);
  }
});

export default router;
