import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'activaqr-dev-secret-cambiar-en-produccion';
const TOKEN_TTL = '30d';

export interface TokenPayload {
  userId: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operador';
  empresaId: string | null;
}

export function firmarToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
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
 * Middleware: exige rol superadmin.
 */
export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.auth?.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acción reservada al administrador del sistema.' });
  }
  next();
}
