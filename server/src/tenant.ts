import { Request } from 'express';
import { prisma } from './prisma';
import { AuthRequest } from './auth';

/**
 * Resuelve la empresa activa para la request (multi-tenant).
 * Orden de prioridad:
 *   1. El usuario autenticado (token): usa su empresaId.
 *      - Si es superadmin, puede actuar sobre cualquier empresa pasando
 *        el header `x-empresa-id` o el query `empresaId`.
 *   2. Header `x-empresa-id` / query `empresaId` (compatibilidad).
 *   3. Modo demo: la primera empresa (solo si no hay auth configurada).
 */
export async function resolveEmpresaId(req: Request): Promise<string> {
  const auth = (req as AuthRequest).auth;

  if (auth) {
    // Superadmin: puede operar sobre la empresa que indique.
    if (auth.rol === 'superadmin') {
      const override =
        req.header('x-empresa-id') ||
        (typeof req.query.empresaId === 'string' ? req.query.empresaId : undefined);
      if (override) {
        const empresa = await prisma.empresa.findUnique({ where: { id: override } });
        if (!empresa) {
          const err: any = new Error('Empresa no encontrada');
          err.status = 404;
          throw err;
        }
        return empresa.id;
      }
      const err: any = new Error('El superadmin debe indicar una empresa (x-empresa-id).');
      err.status = 400;
      throw err;
    }
    // Usuario normal: siempre su propia empresa.
    if (!auth.empresaId) {
      const err: any = new Error('El usuario no tiene empresa asignada.');
      err.status = 403;
      throw err;
    }
    return auth.empresaId;
  }

  // ── Sin auth: compatibilidad / modo demo ──
  const fromHeader = req.header('x-empresa-id');
  const fromQuery =
    typeof req.query.empresaId === 'string' ? req.query.empresaId : undefined;
  const candidate = fromHeader || fromQuery;
  if (candidate) {
    const empresa = await prisma.empresa.findUnique({ where: { id: candidate } });
    if (!empresa) {
      const err: any = new Error('Empresa no encontrada');
      err.status = 404;
      throw err;
    }
    return empresa.id;
  }

  const demo = await prisma.empresa.findFirst({ orderBy: { creadaEn: 'asc' } });
  if (!demo) {
    const err: any = new Error(
      'No hay empresas en la base de datos. Ejecutá el seed (npm run seed).'
    );
    err.status = 404;
    throw err;
  }
  return demo.id;
}
