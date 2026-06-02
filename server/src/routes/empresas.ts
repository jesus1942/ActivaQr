import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth';
import { cancelarPreapproval, mpConfigurado } from '../mercadopago';

const router = Router();

// GET /api/empresas — solo superadmin lista todas; admin ve solo la suya
router.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.auth?.rol === 'superadmin') {
      const empresas = await prisma.empresa.findMany({ orderBy: { creadaEn: 'asc' } });
      return res.json(empresas);
    }
    if (req.auth?.empresaId) {
      const empresa = await prisma.empresa.findUnique({ where: { id: req.auth.empresaId } });
      return res.json(empresa ? [empresa] : []);
    }
    return res.status(403).json({ error: 'No autorizado.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/empresas/:id — superadmin o el propio tenant
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.auth?.rol !== 'superadmin' && req.auth?.empresaId !== req.params.id) {
      return res.status(403).json({ error: 'No autorizado.' });
    }
    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.id } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(empresa);
  } catch (err) {
    next(err);
  }
});

// POST /api/empresas — solo superadmin
router.post('/', requireAuth, requireSuperadmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, logoUrl, plan } = req.body ?? {};
    if (!nombre || typeof nombre !== 'string') {
      return res.status(400).json({ error: 'El campo "nombre" es obligatorio' });
    }
    const empresa = await prisma.empresa.create({
      data: { nombre, cuit, logoUrl, plan },
    });
    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PUT /api/empresas/:id — solo superadmin
router.put('/:id', requireAuth, requireSuperadmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, logoUrl, plan } = req.body ?? {};
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: { nombre, cuit, logoUrl, plan },
    });
    res.json(empresa);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    next(err);
  }
});

// DELETE /api/empresas/mi-suscripcion — el propio admin del tenant cancela su suscripción
router.delete('/mi-suscripcion', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) return res.status(403).json({ error: 'No tenés empresa asociada.' });

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
    if (!empresa.mpPreapprovalId) return res.status(400).json({ error: 'No tenés suscripción activa.' });

    if (mpConfigurado()) {
      await cancelarPreapproval(empresa.mpPreapprovalId);
    }

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { mpEstadoSub: 'cancelled' },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
