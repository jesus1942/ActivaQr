import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

function getIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? null;
}

async function resolverUbicacion(ip: string): Promise<{ pais: string | null; ciudad: string | null }> {
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { pais: null, ciudad: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city&lang=es`, {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json() as { status: string; country?: string; city?: string };
    if (data.status === 'success') {
      return { pais: data.country ?? null, ciudad: data.city ?? null };
    }
  } catch {
    // fallo silencioso — no bloqueamos la visita
  }
  return { pais: null, ciudad: null };
}

export async function registrarVisita(
  req: Request,
  tipo: string,
  activoId?: string | null
): Promise<void> {
  try {
    if (tipo !== 'landing' && tipo !== 'ficha') return;
    const referer = req.headers.referer ?? null;
    const userAgent = req.headers['user-agent'] ?? null;
    const ip = getIp(req);
    const { pais, ciudad } = ip ? await resolverUbicacion(ip) : { pais: null, ciudad: null };
    await prisma.visita.create({
      data: {
        tipo,
        activoId: tipo === 'ficha' ? activoId ?? null : null,
        referer: typeof referer === 'string' ? referer.slice(0, 500) : null,
        userAgent: typeof userAgent === 'string' ? userAgent : null,
        ip: ip?.slice(0, 45) ?? null,
        pais,
        ciudad,
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
