import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../auth';

const router = Router();

// GET /api/push/public-key — sin auth, el frontend la necesita antes de suscribirse.
router.get('/public-key', (_req: Request, res: Response) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

// POST /api/push/subscribe — guarda/actualiza la suscripción del usuario.
router.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado.' });
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Suscripción inválida.' });
    }
    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { usuarioId: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { usuarioId: userId, p256dh: keys.p256dh, auth: keys.auth },
    });
    res.json({ ok: true, id: sub.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/unsubscribe — elimina la suscripción.
router.post('/unsubscribe', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { endpoint } = req.body ?? {};
    if (!endpoint) return res.status(400).json({ error: 'Falta endpoint.' });
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
