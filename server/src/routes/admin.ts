import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { requireAuth, requireSuperadmin, AuthRequest } from '../auth';

const router = Router();

// Todas las rutas de admin requieren superadmin.
router.use(requireAuth, requireSuperadmin);

// GET /api/admin/empresas — lista con conteo de activos y usuarios
router.get('/empresas', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { creadaEn: 'desc' },
      include: {
        _count: { select: { activos: true, usuarios: true } },
        usuarios: {
          where: { rol: 'admin' },
          select: { id: true, nombre: true, email: true, activo: true, ultimoAcceso: true },
        },
      },
    });
    res.json(empresas);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/empresas — crea empresa + su usuario administrador
router.post('/empresas', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, plan, adminNombre, adminEmail, adminPassword } = req.body ?? {};
    if (!nombre || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: 'Faltan datos: nombre de empresa, email y contraseña del administrador.',
      });
    }

    const emailNorm = String(adminEmail).toLowerCase().trim();
    const yaExiste = await prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (yaExiste) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email.' });
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const empresa = await prisma.empresa.create({
      data: {
        nombre,
        cuit: cuit || null,
        plan: plan || 'inicial',
        usuarios: {
          create: {
            email: emailNorm,
            passwordHash,
            nombre: adminNombre || 'Administrador',
            rol: 'admin',
          },
        },
      },
      include: { _count: { select: { activos: true, usuarios: true } } },
    });

    res.status(201).json(empresa);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/empresas/:id — editar datos / plan / estado (suspender)
router.put('/empresas/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, cuit, plan, estado } = req.body ?? {};
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: { nombre, cuit, plan, estado },
    });
    res.json(empresa);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    next(err);
  }
});

// DELETE /api/admin/empresas/:id — elimina empresa y todos sus datos (cascade)
router.delete('/empresas/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.empresa.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }
    next(err);
  }
});

// POST /api/admin/empresas/:id/reset-password — resetea la clave del admin
router.post('/empresas/:id/reset-password', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body ?? {};
    if (!password) return res.status(400).json({ error: 'Falta la nueva contraseña.' });

    const admin = await prisma.usuario.findFirst({
      where: { empresaId: req.params.id, rol: 'admin' },
    });
    if (!admin) return res.status(404).json({ error: 'Usuario administrador no encontrado.' });

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({ where: { id: admin.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
