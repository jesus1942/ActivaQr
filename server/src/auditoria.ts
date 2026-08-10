/**
 * Registro de auditoría — trazabilidad de acciones sobre entidades.
 * La sincronización masiva escribe auditoría dentro de su transacción.
 * Para operaciones individuales este helper no rompe la operación, pero
 * deja un error explícito y estructurado para monitoreo.
 */
import { prisma } from './prisma';
import { AuthRequest } from './auth';

export type AccionAuditoria =
  | 'crear'
  | 'editar'
  | 'eliminar'
  | 'cerrar'
  | 'medicion'
  | 'login'
  | 'acceso_remoto'
  | 'habilitar_modulo'
  | 'alarma'
  | 'comando';

export async function registrarAuditoria(params: {
  empresaId?: string | null;
  usuarioId?: string | null;
  usuarioNombre: string;
  usuarioRol?: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  detalle?: string | null;
}): Promise<void> {
  try {
    await prisma.registroAuditoria.create({
      data: {
        empresaId: params.empresaId ?? null,
        usuarioId: params.usuarioId ?? null,
        usuarioNombre: params.usuarioNombre,
        usuarioRol: params.usuarioRol ?? null,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId ?? null,
        detalle: params.detalle ?? null,
      },
    });
  } catch (error) {
    console.error('[AUDITORIA_ERROR]', JSON.stringify({
      empresaId: params.empresaId ?? null,
      usuarioId: params.usuarioId ?? null,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId ?? null,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}

/** Registra una acción tomando el contexto del request autenticado. */
export async function auditar(
  req: AuthRequest,
  accion: AccionAuditoria,
  entidad: string,
  entidadId?: string | null,
  detalle?: string | null
): Promise<void> {
  const auth = req.auth;
  await registrarAuditoria({
    empresaId: auth?.empresaId ?? null,
    usuarioId: auth?.userId ?? null,
    usuarioNombre: auth?.email ?? 'desconocido',
    usuarioRol: auth?.rol ?? null,
    accion,
    entidad,
    entidadId,
    detalle,
  });
}
