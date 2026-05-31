import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../auth';

const router = Router();

const ORDEN_PLAN: Record<string, number> = { inicial: 0, empresa: 1, industrial: 2 };

// POST /api/suscripcion/solicitar-upgrade
// Requires auth + active empresa (applied by parent router in index.ts)
router.post('/solicitar-upgrade', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) {
      return res.status(403).json({ error: 'Acción solo disponible para empresas.' });
    }

    const { plan } = req.body ?? {};
    if (!plan || !['empresa', 'industrial'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido. Debe ser "empresa" o "industrial".' });
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });

    const planActualOrden = ORDEN_PLAN[empresa.plan] ?? 0;
    const planSolicitadoOrden = ORDEN_PLAN[plan] ?? 0;

    if (planSolicitadoOrden <= planActualOrden) {
      return res.status(400).json({ error: 'El plan solicitado debe ser mayor al plan actual.' });
    }

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { planSolicitado: plan as 'empresa' | 'industrial' },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
