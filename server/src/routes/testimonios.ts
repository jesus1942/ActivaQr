/**
 * Testimonios publicos de la landing.
 *
 * - POST  /api/testimonios               publico, rate-limited, deja pendiente
 * - GET   /api/testimonios               publico, solo aprobados
 * - GET   /api/admin/testimonios         superadmin, todos (con filtro por estado)
 * - POST  /api/admin/testimonios/:id/aprobar
 * - POST  /api/admin/testimonios/:id/rechazar
 * - POST  /api/admin/testimonios/:id/destacar  (toggle)
 * - DELETE /api/admin/testimonios/:id
 *
 * Moderacion obligatoria: los testimonios NO aparecen publicos hasta
 * que el superadmin los aprueba. Protege la marca y cumple Ley 25.326
 * (no se publica PII sin consentimiento explicito del autor + revision
 * manual). Email es opcional y nunca se devuelve al publico.
 */
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../prisma';

const router = Router();

const MAX_MENSAJE = 1500;
const MAX_NOMBRE = 80;
const MAX_ROL = 80;

// Limite agresivo: maximo 3 envios por IP por hora. Spam y abuso.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Demasiados envios desde tu conexion. Probá en una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function sanitize(s: string, max: number): string {
  return s.trim().slice(0, max);
}

// POST publico: crear testimonio pendiente.
router.post('/', submitLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, rol, email, mensaje } = req.body ?? {};
    if (typeof nombre !== 'string' || typeof mensaje !== 'string') {
      return res.status(400).json({ error: 'Faltan datos: nombre y mensaje son obligatorios.' });
    }
    const nombreLimpio = sanitize(nombre, MAX_NOMBRE);
    const mensajeLimpio = sanitize(mensaje, MAX_MENSAJE);
    if (nombreLimpio.length < 2 || mensajeLimpio.length < 10) {
      return res.status(400).json({ error: 'Nombre minimo 2 caracteres, mensaje minimo 10.' });
    }
    const rolLimpio = typeof rol === 'string' ? sanitize(rol, MAX_ROL) : null;
    const emailLimpio = typeof email === 'string' && email.includes('@') ? email.trim().slice(0, 120) : null;

    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? null;
    const userAgent = typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent'].slice(0, 500)
      : null;

    await prisma.testimonio.create({
      data: {
        nombre: nombreLimpio,
        rol: rolLimpio,
        email: emailLimpio,
        mensaje: mensajeLimpio,
        estado: 'pendiente',
        ip,
        userAgent,
      },
    });

    res.status(201).json({ ok: true, mensaje: 'Gracias. Tu testimonio quedo pendiente de revision.' });
  } catch (err) {
    next(err);
  }
});

// GET publico: solo aprobados, sin PII (no email, no IP, no userAgent).
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const aprobados = await prisma.testimonio.findMany({
      where: { estado: 'aprobado' },
      orderBy: [{ destacado: 'desc' }, { aprobadoEn: 'desc' }],
      select: {
        id: true,
        nombre: true,
        rol: true,
        mensaje: true,
        destacado: true,
        aprobadoEn: true,
      },
      take: 100,
    });
    res.json(aprobados);
  } catch (err) {
    next(err);
  }
});

// Router de moderacion (montado bajo /api/admin con requireSuperadmin).
const adminRouter = Router();

adminRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    const where = estado ? { estado } : {};
    const todos = await prisma.testimonio.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
    });
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/:id/aprobar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.testimonio.update({
      where: { id: req.params.id },
      data: { estado: 'aprobado', aprobadoEn: new Date() },
    });
    res.json(t);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/:id/rechazar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.testimonio.update({
      where: { id: req.params.id },
      data: { estado: 'rechazado' },
    });
    res.json(t);
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/:id/destacar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actual = await prisma.testimonio.findUnique({ where: { id: req.params.id } });
    if (!actual) return res.status(404).json({ error: 'No encontrado.' });
    const t = await prisma.testimonio.update({
      where: { id: req.params.id },
      data: { destacado: !actual.destacado },
    });
    res.json(t);
  } catch (err) {
    next(err);
  }
});

adminRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.testimonio.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
export { adminRouter as adminTestimoniosRouter };
