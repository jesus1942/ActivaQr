import { Request } from 'express';
import { prisma } from './prisma';

/**
 * Resuelve la empresa activa para la request (multi-tenant).
 * Orden de prioridad:
 *   1. Header `x-empresa-id`
 *   2. Query param `empresaId`
 *   3. Modo demo: la primera empresa del seed (más antigua).
 *
 * Devuelve el id de empresa o lanza un error con status 404 si no hay ninguna.
 */
export async function resolveEmpresaId(req: Request): Promise<string> {
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

  // Modo demo: primera empresa creada.
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
