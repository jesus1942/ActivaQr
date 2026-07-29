import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { firmarToken, requireAuth, AuthRequest, DEMO_TOKEN_TTL } from '../auth';
import { enviarEmailResetPassword, enviarEmailAltaTrial } from '../email';
import { generarResetToken, hashResetToken } from '../resetTokens';
import { enviarLinkRecuperacion, notificarAdminRecuperacion, notificarAltaTrial } from '../telegram';
import { enviarPushASuperadmin } from '../push';
import { registrarAuditoria } from '../auditoria';
import { faseTrial } from '../trial';
import { POLITICAS_VERSION } from '../politicas';

const router = Router();

const TRIAL_DIAS = 30;
const TRIAL_LECTURA_DIAS = 0; // sin fase intermedia: al dia 31 se bloquea total

// POST /api/auth/registro — alta autogestionada con free trial de 30 dias
router.post('/registro', async (req, res: Response, next: NextFunction) => {
  try {
    const { empresaNombre, nombre, email, password, telefono, aceptaPoliticas, plan, atribucion } = req.body ?? {};
    if (!empresaNombre || !nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan datos: empresa, nombre, email y contraseña.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (aceptaPoliticas !== true) {
      return res.status(400).json({
        code: 'politicas_no_aceptadas',
        error: 'Tenes que aceptar la Politica de Uso y la Politica de Privacidad para crear la cuenta.',
      });
    }
    const emailNorm = String(email).toLowerCase().trim();
    const existente = await prisma.usuario.findUnique({ where: { email: emailNorm } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email. Iniciá sesión.' });
    }

    const ahora = new Date();
    const trialFin = new Date(ahora.getTime() + TRIAL_DIAS * 24 * 60 * 60 * 1000);
    const trialLecturaFin = new Date(trialFin.getTime() + TRIAL_LECTURA_DIAS * 24 * 60 * 60 * 1000);
    const passwordHash = await bcrypt.hash(password, 10);

    const ipAceptacion = (
      (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) ||
      req.socket.remoteAddress ||
      'desconocida'
    ).slice(0, 64);

    const planTrial = ['inicial', 'empresa', 'industrial'].includes(String(plan))
      ? String(plan) as 'inicial' | 'empresa' | 'industrial'
      : 'inicial';
    const atrib = (value: unknown) =>
      typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null;
    const empresa = await prisma.empresa.create({
      data: {
        nombre: String(empresaNombre).trim(),
        plan: planTrial,
        fuenteAlta: atrib(atribucion?.source),
        campanaAlta: atrib(atribucion?.campaign),
        contenidoAlta: atrib(atribucion?.content),
        estado: 'activa',
        esTrial: true,
        trialFin,
        trialLecturaFin,
        politicasAceptadasEn: ahora,
        politicasAceptadasIp: ipAceptacion,
        politicasVersion: POLITICAS_VERSION,
        usuarios: {
          create: {
            nombre: String(nombre).trim(),
            email: emailNorm,
            telefono: telefono ? String(telefono).trim() : null,
            passwordHash,
            rol: 'admin',
            activo: true,
          },
        },
      },
      include: { usuarios: true },
    });

    const usuario = empresa.usuarios[0];
    void registrarAuditoria({
      empresaId: empresa.id,
      usuarioId: usuario.id,
      usuarioNombre: usuario.email,
      usuarioRol: usuario.rol,
      accion: 'crear',
      entidad: 'empresa',
      entidadId: empresa.id,
      detalle: 'alta trial autogestionada',
    });

    // Avisar al dueño de ActivaQR por los tres canales. Nunca demora ni
    // rompe el alta: si un canal falla, queda el error en los logs.
    const panelUrl = `${process.env.APP_PUBLIC_URL || 'https://activaqr.net/'}#/admin`;
    enviarEmailAltaTrial({
      empresaNombre: empresa.nombre,
      adminNombre: usuario.nombre,
      adminEmail: usuario.email,
      adminTelefono: usuario.telefono,
      trialFin,
      panelUrl,
    }).catch((e) => console.error('[registro] email alta:', e));
    notificarAltaTrial({
      empresaNombre: empresa.nombre,
      adminNombre: usuario.nombre,
      adminEmail: usuario.email,
      adminTelefono: usuario.telefono,
      trialFin,
    }).catch((e) => console.error('[registro] telegram alta:', e));
    enviarPushASuperadmin({
      title: `Alta nueva: ${empresa.nombre}`,
      body: `${usuario.nombre} · ${usuario.email} — trial 30 días`,
      url: '#/admin',
    }).catch((e) => console.error('[registro] push alta:', e));

    const token = firmarToken({
      userId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      empresaId: empresa.id,
    });

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresaId: empresa.id,
        empresa: {
          id: empresa.id,
          nombre: empresa.nombre,
          logoUrl: empresa.logoUrl,
          plan: empresa.plan,
          estado: empresa.estado,
          esTrial: true,
          trialFin: empresa.trialFin,
          trialLecturaFin: empresa.trialLecturaFin,
          fase: 'activo',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

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

    void registrarAuditoria({
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      usuarioNombre: usuario.email,
      usuarioRol: usuario.rol,
      accion: 'login',
      entidad: 'sesion',
      entidadId: usuario.id,
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
          ? {
              id: usuario.empresa.id,
              nombre: usuario.empresa.nombre,
              logoUrl: usuario.empresa.logoUrl,
              plan: usuario.empresa.plan,
              estado: usuario.empresa.estado,
              esTrial: usuario.empresa.esTrial,
              trialFin: usuario.empresa.trialFin,
              trialLecturaFin: usuario.empresa.trialLecturaFin,
              fase: faseTrial(usuario.empresa),
            }
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
        ? {
            id: usuario.empresa.id,
            nombre: usuario.empresa.nombre,
            logoUrl: usuario.empresa.logoUrl,
            estado: usuario.empresa.estado,
            plan: usuario.empresa.plan,
            mpEstadoSub: usuario.empresa.mpEstadoSub ?? null,
            esTrial: usuario.empresa.esTrial,
            trialFin: usuario.empresa.trialFin,
            trialLecturaFin: usuario.empresa.trialLecturaFin,
            fase: faseTrial(usuario.empresa),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/perfil — actualizar datos propios (nombre, telegramChatId)
router.patch('/perfil', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { nombre, telegramChatId } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (nombre && String(nombre).trim()) data.nombre = String(nombre).trim();
    if (telegramChatId !== undefined) data.telegramChatId = telegramChatId ? String(telegramChatId).trim() : null;
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada que actualizar.' });
    const updated = await prisma.usuario.update({ where: { id: req.auth!.userId }, data, select: { id: true, nombre: true, telegramChatId: true } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/perfil — datos propios incluyendo telegramChatId
router.get('/perfil', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const u = await prisma.usuario.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, nombre: true, email: true, telefono: true, telegramChatId: true },
    });
    if (!u) return res.status(404).json({ error: 'No encontrado.' });
    res.json(u);
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
      // El token viaja en el link; en la DB queda solo su hash.
      const { token, tokenHash, expiry } = generarResetToken();
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetToken: tokenHash, resetTokenExpiry: expiry },
      });
      const appPublicUrl = process.env.APP_PUBLIC_URL || 'https://activaqr.net/';
      const resetUrl = `${appPublicUrl}#/reset-password?token=${token}`;

      if (usuario.telegramChatId) {
        await enviarLinkRecuperacion({
          chatId: usuario.telegramChatId,
          nombre: usuario.nombre,
          resetUrl,
        }).catch((e) => console.error('[forgot-password] telegram error:', e));
      } else {
        // Fallback: notificar al admin para que reenvíe el link manualmente
        const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID ?? '';
        if (adminChatId) {
          await notificarAdminRecuperacion({
            adminChatId,
            clienteNombre: usuario.nombre,
            clienteEmail: usuario.email,
            resetUrl,
          }).catch((e) => console.error('[forgot-password] telegram-admin error:', e));
        }
        // Intentar email como último recurso
        await enviarEmailResetPassword({
          destinatario: usuario.email,
          adminNombre: usuario.nombre,
          token,
          resetUrl,
        }).catch((e) => console.error('[forgot-password] email error:', e));
      }
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
      where: { resetToken: hashResetToken(token), resetTokenExpiry: { gt: new Date() } },
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
