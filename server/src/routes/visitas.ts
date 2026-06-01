import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

/**
 * Registra una visita (analítica propia, sin terceros ni cookies).
 * Inserta una fila en Visita leyendo referer y user-agent de los headers.
 * Es a prueba de fallos: siempre responde 200 y nunca corta al llamador.
 */
export async function registrarVisita(
  req: Request,
  tipo: string,
  activoId?: string | null
): Promise<void> {
  try {
    if (tipo !== 'landing' && tipo !== 'ficha') return;
    const referer = req.headers.referer ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    await prisma.visita.create({
      data: {
        tipo,
        activoId: tipo === 'ficha' ? activoId ?? null : null,
        referer: typeof referer === 'string' ? referer.slice(0, 500) : null,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      },
    });
  } catch (e) {
    console.error('[VISITA] error registrando visita:', e);
  }
}

// POST /api/visitas — registra una visita. Fire-and-forget friendly.
router.post('/', async (req: Request, res: Response) => {
  try {
    const { tipo, activoId } = req.body ?? {};
    if (tipo !== 'landing' && tipo !== 'ficha') {
      return res.json({ ok: true });
    }
    await registrarVisita(req, tipo, activoId);
  } catch (e) {
    console.error('[VISITA] error en POST /api/visitas:', e);
  }
  res.json({ ok: true });
});

export default router;
