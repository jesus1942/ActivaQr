import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { firmarToken, requireAuth, AuthRequest } from '../auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { empresa: true },
    });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Empresa suspendida: bloquea (salvo superadmin).
    if (
      usuario.rol !== 'superadmin' &&
      usuario.empresa &&
      usuario.empresa.estado === 'suspendida'
    ) {
      return res.status(403).json({
        error: 'La cuenta de tu empresa está suspendida. Contactá al administrador.',
      });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcceso: new Date() },
    });

    const token = firmarToken({
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
    });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empresa: usuario.empresa
          ? { id: usuario.empresa.id, nombre: usuario.empresa.nombre, logoUrl: usuario.empresa.logoUrl }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  — datos del usuario logueado
router.get('/me', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.auth!.userId },
      include: { empresa: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
      empresa: usuario.empresa
        ? { id: usuario.empresa.id, nombre: usuario.empresa.nombre, logoUrl: usuario.empresa.logoUrl, estado: usuario.empresa.estado }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
