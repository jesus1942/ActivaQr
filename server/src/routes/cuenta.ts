/**
 * Endpoints de la cuenta del propio tenant. Solo requireAuth — deben funcionar
 * incluso si la empresa esta bloqueada por trial vencido, para que el admin
 * pueda ver el estado y aceptar las politicas en cualquier momento.
 */
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../auth';
import { POLITICAS_VERSION } from '../politicas';

const router = Router();

// GET /api/cuenta/estado-politicas
router.get('/estado-politicas', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) {
      return res.json({
        sinEmpresa: true,
        politicasVersionVigente: POLITICAS_VERSION,
        requiereAceptarPoliticas: false,
      });
    }
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { politicasAceptadasEn: true, politicasVersion: true },
    });
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada.' });
    res.json({
      politicasAceptadasEn: empresa.politicasAceptadasEn,
      politicasVersion: empresa.politicasVersion,
      politicasVersionVigente: POLITICAS_VERSION,
      requiereAceptarPoliticas:
        !empresa.politicasAceptadasEn || empresa.politicasVersion !== POLITICAS_VERSION,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/cuenta/aceptar-politicas
router.post('/aceptar-politicas', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth?.empresaId;
    if (!empresaId) return res.status(403).json({ error: 'No tenes empresa asociada.' });
    if (req.auth?.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador de la empresa puede aceptar las politicas.' });
    }
    const ip = (
      (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) ||
      req.socket.remoteAddress ||
      'desconocida'
    ).slice(0, 64);
    const empresa = await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        politicasAceptadasEn: new Date(),
        politicasAceptadasIp: ip,
        politicasVersion: POLITICAS_VERSION,
      },
      select: { politicasAceptadasEn: true, politicasVersion: true },
    });
    res.json({
      ok: true,
      politicasAceptadasEn: empresa.politicasAceptadasEn,
      politicasVersion: empresa.politicasVersion,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
