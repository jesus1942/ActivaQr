import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

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
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = leerToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  }
  req.auth = payload;
  next();
}

/**
 * Middleware: exige token válido Y que la empresa esté activa en la DB.
 * Se ejecuta en cada request — el bloqueo es inmediato al suspender.
 * Los superadmin nunca son bloqueados.
 */
export function requireAuthAndActiveEmpresa(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = leerToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
  }
  req.auth = payload;

  // Superadmin: siempre pasa.
  if (payload.rol === 'superadmin' || !payload.empresaId) {
    return next();
  }

  // Verificar estado de la empresa en DB (sin caché, tiempo real).
  prisma.empresa
    .findUnique({ where: { id: payload.empresaId }, select: { estado: true } })
    .then((empresa) => {
      if (!empresa || empresa.estado === 'suspendida') {
        return res.status(403).json({
          code: 'empresa_suspendida',
          error: 'Tu suscripción está suspendida. Contactá al administrador.',
        });
      }
      next();
    })
    .catch(next);
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
