/**
 * Endpoints del catalogo de fallas (knowledge base por categoria de equipo).
 *
 * Filosofia:
 *  - Las fallas globales (empresaId = null) las provee ActivaQR y se ven en
 *    todos los tenants.
 *  - Cada tenant puede agregar fallas propias (empresaId del JWT).
 *  - Hay una ruta publica para que el tecnico en campo, al escanear el QR,
 *    pueda ver las fallas tipicas del equipo sin estar logueado.
 */
import { Router, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AuthRequest, requireAuth, requireAdmin } from '../auth';

export const fallasRouter = Router();

// GET /api/fallas?categoriaId=...  — lista fallas globales + del propio tenant
fallasRouter.get('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { categoriaId } = req.query;
    if (!categoriaId || typeof categoriaId !== 'string') {
      return res.status(400).json({ error: 'Falta categoriaId.' });
    }
    const fallas = await prisma.fallaCatalogo.findMany({
      where: {
        categoriaId,
        OR: [{ empresaId: null }, { empresaId: req.auth?.empresaId ?? '___' }],
      },
      orderBy: [{ severidad: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
    });
    res.json(fallas);
  } catch (err) { next(err); }
});

// POST /api/fallas — el admin del tenant agrega una falla propia
fallasRouter.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth?.empresaId) return res.status(403).json({ error: 'No tenes empresa asociada.' });
    const { categoriaId, codigo, sintoma, causas, solucion, severidad, orden } = req.body ?? {};
    if (!categoriaId || !sintoma || !solucion) {
      return res.status(400).json({ error: 'categoriaId, sintoma y solucion son obligatorios.' });
    }
    const falla = await prisma.fallaCatalogo.create({
      data: {
        categoriaId,
        empresaId: req.auth.empresaId,
        codigo: codigo || null,
        sintoma,
        causas: causas ?? [],
        solucion,
        severidad: severidad || 'advertencia',
        orden: typeof orden === 'number' ? orden : 0,
      },
    });
    res.status(201).json(falla);
  } catch (err) { next(err); }
});

// PUT /api/fallas/:id — actualiza una falla propia (no se pueden editar las globales)
fallasRouter.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existente = await prisma.fallaCatalogo.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ error: 'Falla no encontrada.' });
    if (existente.empresaId === null) {
      return res.status(403).json({ error: 'No se pueden editar las fallas globales del catalogo.' });
    }
    if (existente.empresaId !== req.auth?.empresaId) {
      return res.status(403).json({ error: 'No autorizado.' });
    }
    const { codigo, sintoma, causas, solucion, severidad, orden } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (codigo !== undefined) data.codigo = codigo || null;
    if (sintoma !== undefined) data.sintoma = sintoma;
    if (causas !== undefined) data.causas = causas;
    if (solucion !== undefined) data.solucion = solucion;
    if (severidad !== undefined) data.severidad = severidad;
    if (orden !== undefined) data.orden = orden;
    const falla = await prisma.fallaCatalogo.update({ where: { id: req.params.id }, data });
    res.json(falla);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Falla no encontrada.' });
    }
    next(err);
  }
});

// DELETE /api/fallas/:id — borra una falla propia (no se pueden borrar globales)
fallasRouter.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existente = await prisma.fallaCatalogo.findUnique({ where: { id: req.params.id } });
    if (!existente) return res.status(404).json({ error: 'Falla no encontrada.' });
    if (existente.empresaId === null) {
      return res.status(403).json({ error: 'No se pueden borrar las fallas globales del catalogo.' });
    }
    if (existente.empresaId !== req.auth?.empresaId) {
      return res.status(403).json({ error: 'No autorizado.' });
    }
    await prisma.fallaCatalogo.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /api/public/fallas/activo/:id — lista fallas tipicas del equipo (sin auth)
// Se usa en la ficha publica del QR. Devuelve fallas globales + las del tenant
// dueño del activo, para que el tecnico en campo tenga el knowledge base completo.
export const fallasPublicRouter = Router();

fallasPublicRouter.get('/activo/:id', async (req, res, next) => {
  try {
    const activo = await prisma.activo.findUnique({
      where: { id: req.params.id },
      include: { tipo: { select: { categoriaId: true } } },
    });
    if (!activo || !activo.tipo?.categoriaId) return res.json([]);

    const fallas = await prisma.fallaCatalogo.findMany({
      where: {
        categoriaId: activo.tipo.categoriaId,
        OR: [{ empresaId: null }, { empresaId: activo.empresaId }],
      },
      orderBy: [{ severidad: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
      select: { id: true, codigo: true, sintoma: true, causas: true, solucion: true, severidad: true },
    });
    res.json(fallas);
  } catch (err) { next(err); }
});
