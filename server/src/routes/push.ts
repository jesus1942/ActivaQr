import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../auth';
import { enviarPushAUsuario } from '../push';

const router = Router();

const vapidConfigurado = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

// GET /api/push/public-key — sin auth, el frontend la necesita antes de suscribirse.
router.get('/public-key', (_req: Request, res: Response) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || null });
});

// GET /api/push/status — confirma que el dispositivo quedó registrado de verdad.
router.get('/status', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado.' });
    const endpoint = typeof req.query.endpoint === 'string' ? req.query.endpoint : undefined;
    const suscripciones = await prisma.pushSubscription.count({
      where: endpoint ? { usuarioId: userId, endpoint } : { usuarioId: userId },
    });
    res.json({ configurado: vapidConfigurado(), suscripto: suscripciones > 0, suscripciones });
  } catch (err) {
    next(err);
  }
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
    if (!vapidConfigurado()) {
      return res.status(503).json({ error: 'Web Push no está configurado en el servidor.' });
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

// POST /api/push/test — prueba extremo a extremo desde el mismo dispositivo.
router.post('/test', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado.' });
    if (!vapidConfigurado()) return res.status(503).json({ error: 'Web Push no está configurado en el servidor.' });
    const suscripciones = await prisma.pushSubscription.count({ where: { usuarioId: userId } });
    if (!suscripciones) return res.status(409).json({ error: 'Este dispositivo todavía no quedó suscripto.' });
    await enviarPushAUsuario(userId, {
      title: 'ActivaQR conectado',
      body: 'Esta es una notificación de prueba enviada desde producción.',
      url: '#/configuracion',
      severity: 'info',
      tag: `activaqr-prueba-${Date.now()}`,
    });
    res.json({ ok: true, suscripciones });
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
