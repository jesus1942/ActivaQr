import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { AuthRequest, requireJefatura } from '../auth';
import { puedeGestionarConfiguracionTecnica } from '../rolePolicy';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const includeParametros = {
  parametros: {
    orderBy: { orden: 'asc' as const },
  },
};

function listaValores(valor: unknown): string[] | undefined {
  if (!Array.isArray(valor)) return undefined;
  return [...new Set(
    valor
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

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
router.post('/', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Only admin/superadmin can create
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
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
router.post('/:id/parametros', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden agregar parámetros.' });
    }
    const empresaId = await resolveEmpresaId(req);
    // Can only modify empresa-owned categories
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });

    const {
      nombre, clave, unidad, tipo, obligatorio, orden, opciones,
      valoresAlerta, valoresCritico, valoresUrgente,
      minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente, invertido,
    } = req.body ?? {};
    if (!nombre || !clave) return res.status(400).json({ error: 'Los campos "nombre" y "clave" son obligatorios.' });

    const param = await prisma.parametroCategoria.create({
      data: {
        categoriaId: req.params.id,
        nombre, clave, unidad, tipo, obligatorio, orden,
        opciones: listaValores(opciones),
        valoresAlerta: listaValores(valoresAlerta),
        valoresCritico: listaValores(valoresCritico),
        valoresUrgente: listaValores(valoresUrgente),
        minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente,
        invertido: invertido ?? false,
      },
    });
    res.status(201).json(param);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/categorias/:id ── editar categoría propia ─────────────────────
router.put('/:id', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden editar categorías.' });
    }
    const empresaId = await resolveEmpresaId(req);
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
    const { nombre, icono, descripcion, orden } = req.body ?? {};
    const actualizada = await prisma.categoriaEquipo.update({
      where: { id: req.params.id },
      data: { nombre, icono, descripcion, orden },
      include: includeParametros,
    });
    res.json(actualizada);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/categorias/:id/parametros/:paramId ── editar parámetro ─────────
router.put('/:id/parametros/:paramId', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden editar parámetros.' });
    }
    const empresaId = await resolveEmpresaId(req);
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
    const existente = await prisma.parametroCategoria.findFirst({
      where: { id: req.params.paramId, categoriaId: req.params.id },
    });
    if (!existente) return res.status(404).json({ error: 'Parámetro no encontrado.' });

    const {
      nombre, clave, unidad, tipo, obligatorio, orden, opciones,
      valoresAlerta, valoresCritico, valoresUrgente,
      minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente, invertido,
    } = req.body ?? {};
    const param = await prisma.parametroCategoria.update({
      where: { id: req.params.paramId },
      data: {
        nombre, clave, unidad, tipo, obligatorio, orden,
        opciones: opciones !== undefined ? listaValores(opciones) : undefined,
        valoresAlerta: valoresAlerta !== undefined ? listaValores(valoresAlerta) : undefined,
        valoresCritico: valoresCritico !== undefined ? listaValores(valoresCritico) : undefined,
        valoresUrgente: valoresUrgente !== undefined ? listaValores(valoresUrgente) : undefined,
        minNormal, maxNormal, umbralAlerta, umbralCritico, umbralUrgente, invertido,
      },
    });
    res.json(param);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/categorias/:id/parametros/:paramId ──────────────────────────
router.delete('/:id/parametros/:paramId', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar parámetros.' });
    }
    const empresaId = await resolveEmpresaId(req);
    const cat = await prisma.categoriaEquipo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada o no editable.' });
    const existente = await prisma.parametroCategoria.findFirst({
      where: { id: req.params.paramId, categoriaId: req.params.id },
    });
    if (!existente) return res.status(404).json({ error: 'Parámetro no encontrado.' });
    await prisma.parametroCategoria.delete({ where: { id: req.params.paramId } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/categorias/:id ── solo categorías propias ───────────────────
router.delete('/:id', requireJefatura, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
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
