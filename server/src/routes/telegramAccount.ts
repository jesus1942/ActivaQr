import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { prisma } from '../prisma';
import { AuthRequest, hashCodigoTelegram, huellasIguales, requireAuth } from '../auth';
import { enviarMensajeTelegram } from '../telegram';

const router = Router();

/** Borra el desafío pendiente; no modifica el Telegram ya confirmado. */
export const limpiarVinculacionTelegram = {
  telegramPendingChatId: null,
  telegramLinkCodeHash: null,
  telegramLinkExpires: null,
  telegramLinkAttempts: 0,
};

const perfilPublico = {
  id: true, nombre: true, telegramChatId: true,
  telegramAlertasHabilitadas: true, telegramAlertasAceptadasEn: true,
} as const;

// Se aplica después de autenticar: distintos IP no multiplican los intentos de una cuenta.
const limiteCuenta = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  keyGenerator: (req) => (req as AuthRequest).auth!.userId,
  message: { error: 'Demasiados intentos. Volvé a intentar en 15 minutos.' },
});
const limiteEnvios = rateLimit({
  windowMs: 15 * 60 * 1000, max: 3,
  keyGenerator: (req) => (req as AuthRequest).auth!.userId,
  message: { error: 'Ya solicitaste varios códigos. Esperá 15 minutos.' },
});

// También limita las comprobaciones de contraseña al desvincular desde el perfil.
router.patch('/perfil', requireAuth, limiteCuenta);

/** Verifica la contraseña antes de enviar un desafío al nuevo chat privado. */
router.post('/telegram/vincular', requireAuth, limiteEnvios, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { telegramChatId, password } = req.body ?? {};
    if (typeof telegramChatId !== 'string' || !/^[1-9]\d{0,15}$/.test(telegramChatId.trim())) {
      return res.status(400).json({ error: 'Ingresá el Chat ID de tu conversación privada con el bot.' });
    }
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    if (typeof password !== 'string' || password.length > 256 || !(await bcrypt.compare(password, usuario.passwordHash))) {
      return res.status(403).json({ error: 'La contraseña actual no es correcta.' });
    }
    const chatId = telegramChatId.trim();
    if (chatId === usuario.telegramChatId) {
      return res.status(400).json({ error: 'Ese Telegram ya está vinculado.' });
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({ error: 'Telegram no está disponible. Intentá más tarde.' });
    }
    const code = randomInt(0, 1000000).toString().padStart(6, '0');
    const codeHash = hashCodigoTelegram(usuario.id, chatId, usuario.passwordHash, code);
    const guardado = await prisma.usuario.updateMany({
      where: { id: usuario.id, passwordHash: usuario.passwordHash, telegramChatId: usuario.telegramChatId },
      data: {
        telegramPendingChatId: chatId, telegramLinkCodeHash: codeHash,
        telegramLinkExpires: new Date(Date.now() + 10 * 60 * 1000), telegramLinkAttempts: 0,
      },
    });
    if (!guardado.count) return res.status(409).json({ error: 'Tu cuenta cambió. Iniciá el proceso nuevamente.' });
    try {
      const enviado = await enviarMensajeTelegram(chatId,
        `ActivaQR: tu código para vincular Telegram es ${code}. Vence en 10 minutos. Ingresalo únicamente en la configuración de tu cuenta. Si no lo solicitaste, ignorá este mensaje.`);
      if (!enviado) throw new Error('Telegram no disponible');
    } catch {
      await prisma.usuario.updateMany({ where: { id: usuario.id, telegramLinkCodeHash: codeHash }, data: limpiarVinculacionTelegram });
      return res.status(502).json({ error: 'No pudimos enviar el código. Iniciá primero el chat con el bot y verificá el Chat ID.' });
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
});

/** Consume una verificación una sola vez y limita a cinco intentos, incluso concurrentes. */
router.post('/telegram/confirmar', requireAuth, limiteCuenta, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, telegramAlertasHabilitadas } = req.body ?? {};
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Ingresá el código de seis dígitos.' });
    }
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: req.auth!.userId } });
    if (!usuario.telegramPendingChatId || !usuario.telegramLinkCodeHash ||
        !usuario.telegramLinkExpires || usuario.telegramLinkExpires <= new Date() || usuario.telegramLinkAttempts >= 5) {
      return res.status(400).json({ error: 'El código venció o agotaste los intentos. Solicitá uno nuevo.' });
    }
    const coincide = huellasIguales(usuario.telegramLinkCodeHash,
      hashCodigoTelegram(usuario.id, usuario.telegramPendingChatId, usuario.passwordHash, code));
    const where = {
      id: usuario.id, passwordHash: usuario.passwordHash, telegramChatId: usuario.telegramChatId,
      telegramLinkCodeHash: usuario.telegramLinkCodeHash,
      telegramLinkExpires: { gt: new Date() }, telegramLinkAttempts: { lt: 5 },
    };
    if (!coincide) {
      await prisma.usuario.updateMany({ where, data: { telegramLinkAttempts: { increment: 1 } } });
      return res.status(400).json({ error: 'El código no es correcto.' });
    }
    const habilitadas = telegramAlertasHabilitadas === true;
    const cambio = await prisma.usuario.updateMany({ where, data: {
      ...limpiarVinculacionTelegram, telegramChatId: usuario.telegramPendingChatId,
      telegramAlertasHabilitadas: habilitadas, telegramAlertasAceptadasEn: habilitadas ? new Date() : null,
      // Un enlace enviado al canal anterior deja de servir al cambiar el canal.
      resetToken: null, resetTokenExpiry: null,
    } });
    if (!cambio.count) return res.status(400).json({ error: 'El código ya no está disponible. Solicitá uno nuevo.' });
    const perfil = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: perfilPublico });
    res.json(perfil);
  } catch (error) { next(error); }
});

export default router;
