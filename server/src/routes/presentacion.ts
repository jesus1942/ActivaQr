import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRequest, requireAuth, requireSuperadmin } from '../auth';
import { generarNarracionNatural, vozNaturalConfigurada } from '../presentacionVoz';

const router = Router();

router.use(requireAuth, requireSuperadmin);

const vozLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Se alcanzó el límite temporal de generación de voz. Intentá más tarde.' },
});

router.get('/estado', (_req: AuthRequest, res: Response) => {
  res.json({
    disponible: vozNaturalConfigurada(),
    motor: vozNaturalConfigurada() ? 'openai' : null,
    perfil: 'es-AR-rioplatense-natural-v1',
  });
});

router.post('/narracion', vozLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lamina = Number(req.body?.lamina);
    const texto = typeof req.body?.texto === 'string' ? req.body.texto : '';
    const audio = await generarNarracionNatural(lamina, texto);
    res.set({
      'Content-Type': audio.contentType,
      'Content-Length': String(audio.contenido.length),
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-ActivaQR-Voice': 'ai-rioplatense-natural-v1',
    });
    res.send(audio.contenido);
  } catch (error) {
    const controlado = error as Error & { status?: number; code?: string };
    if (controlado.status) {
      return res.status(controlado.status).json({ code: controlado.code, error: controlado.message });
    }
    next(error);
  }
});

export default router;
