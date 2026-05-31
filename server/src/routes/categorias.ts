import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { AuthRequest } from '../auth';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const includeParametros = {
  parametros: {
    orderBy: { orden: 'asc' as const },
  },
};

// ─── GET /api/categorias ─── lista globales + propias de la empresa ─────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const categorias = await prisma.categoriaEquipo.findMany({
      where: {
        OR: [
          { empresaId: null },
          { empresaId },
        ],
      },
      include: includeParametros,
      orderBy: { orden: 'asc' },
    });
    res.json(categorias);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/categorias/:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const cat = await prisma.categoriaEquipo.findFirst({
      where: {
        id: req.params.id,
        OR: [{ empresaId: null }, { empresaId }],
      },
      include: includeParametros,
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(cat);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/categorias ── crear categoría propia de la empresa ────────────
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only admin/superadmin can create
    if (!req.auth || (req.auth.rol !== 'admin' && req.auth.rol !== 'superadmin')) {
      return res.status(403).json({ error: 'Solo administradores pueden crear categorías.' });
    }
    const empresaId = await resolveEmpresaId(req);
    const { nombre, icono, descripcion, orden } = req.body ?? {};
    if (!nombre) return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
    const cat = await prisma.categoriaEquipo.create({
      data: { empresaId, nombre, icono, descripcion, orden: orden ?? 0 },
      include: includeParametros,
    });
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/categorias/:id/parametros ── agregar parámetro ────────────────
router.post('/:id/parametros', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || (req.auth.rol !== 'admin' && req.auth.rol !== 'superadmin')) {
      return res.status(403).json({ error: 'Solo administradores pueden agregar parámetros.' });
    }
    const empresaId = await resolveEmpresaId(req);
    // Can only modify empresa-owned categories
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });

    const {
      nombre, clave, unidad, tipo, obligatorio, orden,
      minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente, invertido,
    } = req.body ?? {};
    if (!nombre || !clave) return res.status(400).json({ error: 'Los campos "nombre" y "clave" son obligatorios.' });

    const param = await prisma.parametroCategoria.create({
      data: {
        categoriaId: req.params.id,
        nombre, clave, unidad, tipo, obligatorio, orden,
        minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente,
        invertido: invertido ?? false,
      },
    });
    res.status(201).json(param);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/categorias/:id ── solo categorías propias ───────────────────
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || (req.auth.rol !== 'admin' && req.auth.rol !== 'superadmin')) {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar categorías.' });
    }
    const empresaId = await resolveEmpresaId(req);
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
    await prisma.categoriaEquipo.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Superadmin routes (mounted at /api/admin/categorias-globales) ──────────

export const adminCategoriasRouter = Router();

adminCategoriasRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categorias = await prisma.categoriaEquipo.findMany({
      where: { empresaId: null },
      include: includeParametros,
      orderBy: { orden: 'asc' },
    });
    res.json(categorias);
  } catch (err) {
    next(err);
  }
});

adminCategoriasRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nombre, icono, descripcion, orden } = req.body ?? {};
    if (!nombre) return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
    const cat = await prisma.categoriaEquipo.create({
      data: { empresaId: null, nombre, icono, descripcion, orden: orden ?? 0 },
      include: includeParametros,
    });
    res.status(201).json(cat);
  } catch (err) {
    next(err);
  }
});

export default router;
