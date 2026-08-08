import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from './prisma';
import { faseTrial } from './trial';
import {
  RolAplicacion,
  puedeAdministrarTenant,
  puedeCargarTrabajoCampo,
  puedeConsultarDireccion,
  puedeConsultarGestion,
  puedeGestionarConfiguracionTecnica,
  puedeGestionarOperacion,
} from './rolePolicy';

function resolverJwtSecret(): string {
  const configurado = process.env.JWT_SECRET?.trim();
  if (configurado) return configurado;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }
  console.warn('[auth] JWT_SECRET no configurada: se usa una clave efimera solo para desarrollo.');
  return randomBytes(32).toString('hex');
}

const JWT_SECRET = resolverJwtSecret();
export const TOKEN_TTL = '7d';
export const DEMO_TOKEN_TTL = '2h';

export interface TokenPayload {
  userId: string;
  email: string;
  rol: RolAplicacion;
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

async function autenticarRequest(
  req: Request,
  res: Response,
): Promise<TokenPayload | null> {
  const token = leerToken(req);
  const payload = token ? verificarToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'No autorizado. Iniciá sesión.' });
    return null;
  }
  const actual = await validarUsuarioActual(payload);
  if (!actual) {
    res.status(401).json({
      code: 'sesion_revocada',
      error: 'La sesión fue revocada o tus permisos cambiaron. Iniciá sesión nuevamente.',
    });
    return null;
  }
  return actual;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const actual = await autenticarRequest(req, res);
    if (!actual) return;
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
  try {
    const actual = await autenticarRequest(req, res);
    if (!actual) return;
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

    // Dirección trabaja sobre información consolidada y evidencia, pero no
    // altera la operación. Esta guarda transversal evita que un endpoint
    // nuevo quede escribible por omisión aunque la interfaz no lo muestre.
    if (actual.rol === 'direccion' && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({
        code: 'perfil_solo_lectura',
        error: 'El perfil Dirección es de consulta y no puede modificar datos operativos.',
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
  if (!req.auth || !puedeAdministrarTenant(req.auth.rol)) {
    return res.status(403).json({ error: 'Acción reservada al administrador de la empresa.' });
  }
  next();
}

/** Permite operar activos, planes y órdenes sin administrar la cuenta. */
export function requireGestionOperacion(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || !puedeGestionarOperacion(req.auth.rol)) {
    return res.status(403).json({ error: 'Tu perfil no puede modificar la operación de mantenimiento.' });
  }
  next();
}

/** Permite configurar la estructura técnica y borrar historial. */
export function requireJefatura(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || !puedeGestionarConfiguracionTecnica(req.auth.rol)) {
    return res.status(403).json({ error: 'Acción reservada a Jefatura o al administrador de la empresa.' });
  }
  next();
}

/** Permite registrar mediciones y cerrar trabajo asignado en campo. */
export function requireTrabajoCampo(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || !puedeCargarTrabajoCampo(req.auth.rol)) {
    return res.status(403).json({ error: 'Tu perfil es de consulta y no puede registrar cambios.' });
  }
  next();
}

/** Información de cumplimiento, riesgo y trazabilidad para mandos. */
export function requireConsultaGestion(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || !puedeConsultarGestion(req.auth.rol)) {
    return res.status(403).json({ error: 'Tu perfil no tiene acceso a esta vista de gestión.' });
  }
  next();
}

/** Información comercial y de costos para Dirección y dueños de cuenta. */
export function requireConsultaDireccion(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || !puedeConsultarDireccion(req.auth.rol)) {
    return res.status(403).json({ error: 'Esta información está reservada a Dirección y al administrador.' });
  }
  next();
}
