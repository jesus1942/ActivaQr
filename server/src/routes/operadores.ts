import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthRequest } from '../auth';

const router = Router();

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.auth?.rol !== 'admin' && req.auth?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Solo administradores pueden gestionar operadores.' });
  }
  next();
}

const selectOperador = {
  id: true,
  nombre: true,
  email: true,
  cargo: true,
  telefono: true,
  activo: true,
  creadoEn: true,
  ultimoAcceso: true,
} as const;

// GET /api/operadores
router.get('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sin empresa asignada.' });

    const operadores = await prisma.usuario.findMany({
      where: { empresaId, rol: 'operador' },
      select: selectOperador,
      orderBy: { nombre: 'asc' },
    });
    res.json(operadores);
  } catch (err) {
    next(err);
  }
});

// POST /api/operadores
router.post('/', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sin empresa asignada.' });

    const { nombre, email, password, cargo } = req.body ?? {};
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const emailNorm = String(email).toLowerCase().trim();
    const yaExiste = await prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (yaExiste) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const operador = await prisma.usuario.create({
      data: {
        empresaId,
        email: emailNorm,
        passwordHash,
        nombre: String(nombre).trim(),
        cargo: cargo ? String(cargo).trim() : null,
        rol: 'operador',
      },
      select: selectOperador,
    });

    res.status(201).json(operador);
  } catch (err) {
    next(err);
  }
});

// PUT /api/operadores/:id — actualizar nombre y cargo
router.put('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sin empresa asignada.' });

    const operador = await prisma.usuario.findFirst({
      where: { id: req.params.id, empresaId, rol: 'operador' },
    });
    if (!operador) return res.status(404).json({ error: 'Operador no encontrado.' });

    const { nombre, cargo } = req.body ?? {};
    const data: any = {};
    if (nombre !== undefined) data.nombre = String(nombre).trim();
    if (cargo !== undefined) data.cargo = cargo ? String(cargo).trim() : null;

    const updated = await prisma.usuario.update({
      where: { id: operador.id },
      data,
      select: selectOperador,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/operadores/:id — desactivar (soft delete)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sin empresa asignada.' });

    const operador = await prisma.usuario.findFirst({
      where: { id: req.params.id, empresaId, rol: 'operador' },
    });
    if (!operador) return res.status(404).json({ error: 'Operador no encontrado.' });

    await prisma.usuario.update({
      where: { id: operador.id },
      data: { activo: false },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/operadores/:id/password
router.patch('/:id/password', requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresaId = req.auth!.empresaId;
    if (!empresaId) return res.status(400).json({ error: 'Sin empresa asignada.' });

    const { password } = req.body ?? {};
    if (!password) return res.status(400).json({ error: 'La nueva contraseña es obligatoria.' });
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const operador = await prisma.usuario.findFirst({
      where: { id: req.params.id, empresaId, rol: 'operador' },
    });
    if (!operador) return res.status(404).json({ error: 'Operador no encontrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({
      where: { id: operador.id },
      data: { passwordHash },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
