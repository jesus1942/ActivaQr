import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';

const router = Router();

// GET /api/auditoria?entidad=&accion=&limit=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const entidad = typeof req.query.entidad === 'string' ? req.query.entidad : undefined;
    const accion = typeof req.query.accion === 'string' ? req.query.accion : undefined;
    const limit = Math.min(Number(req.query.limit) || 200, 500);

    const registros = await prisma.registroAuditoria.findMany({
      where: {
        empresaId,
        ...(entidad ? { entidad } : {}),
        ...(accion ? { accion } : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: limit,
    });
    res.json(registros);
  } catch (err) {
    next(err);
  }
});

export default router;
