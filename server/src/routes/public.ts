/**
 * Rutas públicas — accesibles sin sesión.
 * Solo lectura. Se usan para mostrar la ficha técnica via QR.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { aplicarVisibilidad } from '../visibilidad';

const router = Router();

// Planes que permiten ver fichas QR aunque la empresa esté suspendida.
const PLANES_CON_FICHA_PUBLICA = ['empresa', 'industrial'];

// GET /api/public/activos/:id — ficha técnica de un activo (para QR)
router.get('/activos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activo = await prisma.activo.findUnique({
      where: { id: req.params.id },
      include: {
        empresa: { select: { id: true, nombre: true, logoUrl: true, estado: true, plan: true } },
        sector: { select: { nombre: true } },
        tipo: { select: { nombre: true } },
        responsable: { select: { nombre: true, email: true, telefono: true } },
        mediciones: {
          orderBy: { fecha: 'desc' },
          take: 1,
        },
      },
    });

    if (!activo) return res.status(404).json({ error: 'Activo no encontrado.' });

    const empresa = activo.empresa;

    // Si la empresa está suspendida, solo planes empresa/industrial permiten ver la ficha.
    if (empresa.estado === 'suspendida' && !PLANES_CON_FICHA_PUBLICA.includes(empresa.plan)) {
      return res.status(403).json({
        code: 'empresa_suspendida',
        error: 'Este servicio está temporalmente suspendido.',
      });
    }

    res.json(aplicarVisibilidad(activo));
  } catch (err) {
    next(err);
  }
});

export default router;
