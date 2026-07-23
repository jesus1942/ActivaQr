import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { faseTrial } from './trial';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production'); })() : 'activaqr-dev-secret-local');
export const TOKEN_TTL = '7d';
export const DEMO_TOKEN_TTL = '2h';

export interface TokenPayload {
  userId: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operador';
  empresaId: string | null;
}

export function firmarToken(payload: TokenPayload, ttl?: string): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (ttl ?? TOKEN_TTL) as any });
}

export function verificarToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Extiende Request para llevar el usuario autenticado.
export interface AuthRequest extends Request {
  auth?: TokenPayload;
}

function leerToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Middleware: exige un token válido. Deja el payload en req.auth.
 */
async function validarUsuarioActual(payload: TokenPayload): Promise<TokenPayload | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, rol: true, empresaId: true, activo: true },
  });
  if (!usuario?.activo) return null;
  if (
    usuario.email !== payload.email ||
    usuario.rol !== payload.rol ||
    usuario.empresaId !== payload.empresaId
  ) {
    return null;
  }
  return payload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = leerToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  }
  try {
    const actual = await validarUsuarioActual(payload);
    if (!actual) {
      return res.status(401).json({
        code: 'sesion_revocada',
        error: 'La sesión fue revocada o tus permisos cambiaron. Iniciá sesión nuevamente.',
      });
    }
    req.auth = actual;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: exige token válido Y que la empresa esté activa en la DB.
 * Se ejecuta en cada request — el bloqueo es inmediato al suspender.
 * Los superadmin nunca son bloqueados.
 */
export async function requireAuthAndActiveEmpresa(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = leerToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  }
  try {
    const actual = await validarUsuarioActual(payload);
    if (!actual) {
      return res.status(401).json({
        code: 'sesion_revocada',
        error: 'La sesión fue revocada o tus permisos cambiaron. Iniciá sesión nuevamente.',
      });
    }
    req.auth = actual;

    // Superadmin: siempre pasa.
    if (actual.rol === 'superadmin' || !actual.empresaId) {
      return next();
    }

    // Verificar estado de la empresa en DB (sin caché, tiempo real).
    const empresa = await prisma.empresa.findUnique({
      where: { id: actual.empresaId! },
      select: { estado: true, esTrial: true, trialFin: true, trialLecturaFin: true },
    });
    if (!empresa || empresa.estado === 'suspendida') {
      return res.status(403).json({
        code: 'empresa_suspendida',
        error: 'Tu suscripción está suspendida. Contactá al administrador.',
      });
    }

    const fase = faseTrial(empresa);
    if (fase === 'vencido') {
      return res.status(403).json({
        code: 'trial_vencido',
        error: 'Tu período de prueba terminó. Suscribite para seguir usando ActivaQR.',
      });
    }
    if (fase === 'lectura' && req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(403).json({
        code: 'trial_lectura',
        error: 'Tu prueba está en modo solo lectura. Suscribite para volver a cargar datos.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: exige rol superadmin.
 */
export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.auth?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acción reservada al administrador del sistema.' });
  }
  next();
}

/**
 * Middleware: exige rol admin (dueño de empresa) o superadmin.
 * Las operaciones destructivas o de configuración quedan fuera del alcance del operador.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.auth?.rol !== 'admin' && req.auth?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acción reservada al administrador de la empresa.' });
  }
  next();
}
