import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { firmarToken, requireAuth, AuthRequest, DEMO_TOKEN_TTL } from '../auth';
import { enviarEmailResetPassword } from '../email';

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

    const isDemo = usuario.email === 'demo@activaqr.com';
    const token = firmarToken({
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: usuario.empresaId,
    }, isDemo ? DEMO_TOKEN_TTL : undefined);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        empresa: usuario.empresa
          ? { id: usuario.empresa.id, nombre: usuario.empresa.nombre, logoUrl: usuario.empresa.logoUrl, plan: usuario.empresa.plan }
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
        ? { id: usuario.empresa.id, nombre: usuario.empresa.nombre, logoUrl: usuario.empresa.logoUrl, estado: usuario.empresa.estado, plan: usuario.empresa.plan, mpEstadoSub: usuario.empresa.mpEstadoSub ?? null }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', async (req, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body ?? {};
    if (!email) return res.status(400).json({ error: 'Email es obligatorio.' });
    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken: token, resetTokenExpiry: expiry },
      });
      const appPublicUrl = process.env.APP_PUBLIC_URL || 'https://jesus1942.github.io/ActivaQr/';
      const resetUrl = `${appPublicUrl}#/reset-password?token=${token}`;
      await enviarEmailResetPassword({
        destinatario: usuario.email,
        adminNombre: usuario.nombre,
        token,
        resetUrl,
      }).catch((e) => console.error('[forgot-password] email error:', e));
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', async (req, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token y contrasena son obligatorios.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: String(token), resetTokenExpiry: { gt: new Date() } },
    });
    if (!usuario) {
      return res.status(400).json({ error: 'Token invalido o expirado' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
