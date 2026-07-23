import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { resolveEmpresaId } from '../tenant';
import { AuthRequest } from '../auth';
import {
  calcularEstadoAutomatico,
  calcularEstadoParametrosExtra,
  peorEstado,
} from '../alertas';

const router = Router();
const prisma = new PrismaClient();

/**
 * Envuelve un handler async para que cualquier error (ej: dato inválido,
 * falla de Prisma) se reenvíe al error handler global en lugar de dejar
 * la request colgada — Express 4 no captura promesas rechazadas solo.
 */
const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

// Helpers de coerción.
const toDate = (v: unknown): Date | null =>
  v === undefined || v === null || v === '' ? null : new Date(v as string);
const toNum = (v: unknown): number | null =>
  v === undefined || v === null || v === '' ? null : Number(v);

function payload(req: Request): { items: any[]; deletedIds: string[] } {
  // Clientes viejos pueden seguir enviando un array. Se acepta para upsert,
  // pero nunca se interpreta una omisión como borrado.
  if (Array.isArray(req.body)) return { items: req.body, deletedIds: [] };
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const deletedIds: string[] = Array.isArray(req.body?.deletedIds)
    ? [...new Set<string>(req.body.deletedIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
    : [];
  return { items, deletedIds };
}

function idsDuplicados(items: any[]): boolean {
  const ids = items.map((i) => i?.id).filter(Boolean);
  return new Set(ids).size !== ids.length;
}

function auditoriaSync(req: Request, empresaId: string, entidad: string, upserts: number, eliminados: number) {
  const auth = (req as AuthRequest).auth;
  return prisma.registroAuditoria.create({
    data: {
      empresaId,
      usuarioId: auth?.userId ?? null,
      usuarioNombre: auth?.email ?? 'desconocido',
      usuarioRol: auth?.rol ?? null,
      accion: 'editar',
      entidad: `sync_${entidad}`,
      detalle: JSON.stringify({ upserts, eliminados }),
    },
  });
}

/**
 * Sincronización por entidad:
 * - upserts explícitos en `items`
 * - bajas explícitas en `deletedIds`
 * - cada ID se valida contra el tenant antes del upsert
 * - la auditoría se escribe dentro de la misma transacción
 */

// ───────── Sectores ─────────
router.put('/sectores', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const { items, deletedIds } = payload(req);
  if (idsDuplicados(items)) return res.status(400).json({ error: 'Hay IDs de sectores duplicados.' });
  const ids = items.map((i) => i.id);
  const existentes = ids.length
    ? await prisma.sector.findMany({ where: { id: { in: ids } }, select: { id: true, empresaId: true } })
    : [];
  if (existentes.some((item) => item.empresaId !== empresaId)) {
    return res.status(403).json({ code: 'tenant_violation', error: 'Un sector pertenece a otra empresa.' });
  }

  await prisma.$transaction([
    ...(deletedIds.length
      ? [prisma.sector.deleteMany({ where: { empresaId, id: { in: deletedIds } } })]
      : []),
    ...items.map((i) =>
      prisma.sector.upsert({
        where: { id: i.id },
        create: {
          id: i.id,
          empresaId,
          nombre: i.nombre,
          color: i.color ?? null,
          activo: i.activo ?? true,
        },
        update: { nombre: i.nombre, color: i.color ?? null, activo: i.activo ?? true },
      })
    ),
    auditoriaSync(req, empresaId, 'sectores', items.length, deletedIds.length),
  ]);
  res.json({ synced: items.length, deleted: deletedIds.length });
}));

// ───────── Tipos ─────────
router.put('/tipos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const { items, deletedIds } = payload(req);
  if (idsDuplicados(items)) return res.status(400).json({ error: 'Hay IDs de tipos duplicados.' });
  const ids = items.map((i) => i.id);
  const existentes = ids.length
    ? await prisma.tipoActivo.findMany({ where: { id: { in: ids } }, select: { id: true, empresaId: true } })
    : [];
  if (existentes.some((item) => item.empresaId !== empresaId)) {
    return res.status(403).json({ code: 'tenant_violation', error: 'Un tipo de activo pertenece a otra empresa.' });
  }

  await prisma.$transaction([
    ...(deletedIds.length
      ? [prisma.tipoActivo.deleteMany({ where: { empresaId, id: { in: deletedIds } } })]
      : []),
    ...items.map((i) => {
      const data = {
        nombre: i.nombre,
        icono: i.icono ?? null,
        mideTemperatura: !!i.mideTemperatura,
        mideAmperaje: !!i.mideAmperaje,
        midePresion: !!i.midePresion,
        mideVibracion: !!i.mideVibracion,
        mideBateria: !!i.mideBateria,
        mideToner: !!i.mideToner,
        mideContador: !!i.mideContador,
        mideVoltaje: !!i.mideVoltaje,
        activo: i.activo ?? true,
      };
      return prisma.tipoActivo.upsert({
        where: { id: i.id },
        create: { id: i.id, empresaId, ...data },
        update: data,
      });
    }),
    auditoriaSync(req, empresaId, 'tipos', items.length, deletedIds.length),
  ]);
  res.json({ synced: items.length, deleted: deletedIds.length });
}));

// ───────── Personal (ex-tecnicos) — no-op: se gestionan via /api/operadores
router.put('/tecnicos', asyncHandler(async (_req, res) => {
  res.json({ synced: 0 });
}));

// ───────── Activos ─────────
router.put('/activos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const { items, deletedIds } = payload(req);
  if (idsDuplicados(items)) return res.status(400).json({ error: 'Hay IDs de activos duplicados.' });
  const ids = items.map((i) => i.id);
  const existentes = ids.length
    ? await prisma.activo.findMany({ where: { id: { in: ids } }, select: { id: true, empresaId: true } })
    : [];
  if (existentes.some((item) => item.empresaId !== empresaId)) {
    return res.status(403).json({ code: 'tenant_violation', error: 'Un activo pertenece a otra empresa.' });
  }


  // ─── Defensa contra IDs falsos del frontend ───────────────────────
  // El frontend tiene un store local de 'tecnicos' con IDs que no existen
  // como Usuario en BD. Si un activo viene con responsableId que no es un
  // Usuario real, lo seteamos null para no romper la foreign key.
  // sedeId, sectorId y tipoId tambien se sanean: vacios -> null o se
  // descarta el activo (en sectorId y tipoId, que son obligatorios).
  const respIds = items
    .map((i) => i.responsableId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  const usuariosExistentes = respIds.length > 0
    ? await prisma.usuario.findMany({
        where: { id: { in: respIds }, empresaId },
        select: { id: true },
      })
    : [];
  const responsablesValidos = new Set(usuariosExistentes.map((u) => u.id));

  const sedeIds = items
    .map((i) => i.sedeId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  const sedesExistentes = sedeIds.length > 0
    ? await prisma.sede.findMany({
        where: { id: { in: sedeIds }, empresaId },
        select: { id: true },
      })
    : [];
  const sedesValidas = new Set(sedesExistentes.map((s) => s.id));
  const sectorIds = items.map((i) => i.sectorId).filter((id): id is string => typeof id === 'string' && id.length > 0);
  const tipoIds = items.map((i) => i.tipoId).filter((id): id is string => typeof id === 'string' && id.length > 0);
  const [sectoresExistentes, tiposExistentes] = await Promise.all([
    sectorIds.length ? prisma.sector.findMany({ where: { id: { in: sectorIds }, empresaId }, select: { id: true } }) : [],
    tipoIds.length ? prisma.tipoActivo.findMany({ where: { id: { in: tipoIds }, empresaId }, select: { id: true } }) : [],
  ]);
  const sectoresValidos = new Set(sectoresExistentes.map((s) => s.id));
  const tiposValidos = new Set(tiposExistentes.map((t) => t.id));

  // Filtrar activos invalidos: sin sectorId o tipoId, los descartamos para
  // que un activo malo no tire toda la transaccion (y que el frontend al
  // menos sincronice el resto).
  const itemsValidos = items.filter((i) => {
    const sectorOk = typeof i.sectorId === 'string' && sectoresValidos.has(i.sectorId);
    const tipoOk = typeof i.tipoId === 'string' && tiposValidos.has(i.tipoId);
    if (!sectorOk || !tipoOk) {
      console.warn('[sync/activos] descartando activo sin sectorId/tipoId:', i.id, i.codigo);
      return false;
    }
    return true;
  });
  await prisma.$transaction([
    ...(deletedIds.length
      ? [prisma.activo.deleteMany({ where: { empresaId, id: { in: deletedIds } } })]
      : []),
    ...itemsValidos.map((i) => {
      const respCandidato = typeof i.responsableId === 'string' ? i.responsableId.trim() : '';
      const responsableId = respCandidato && responsablesValidos.has(respCandidato) ? respCandidato : null;
      const sedeCandidata = typeof i.sedeId === 'string' ? i.sedeId.trim() : '';
      const sedeId = sedeCandidata && sedesValidas.has(sedeCandidata) ? sedeCandidata : null;
      const data = {
        codigo: i.codigo,
        nombre: i.nombre,
        sectorId: i.sectorId,
        tipoId: i.tipoId,
        responsableId,
        sedeId,
        marca: i.marca ?? null,
        modelo: i.modelo ?? null,
        fechaIngreso: toDate(i.fechaIngreso) ?? new Date(),
        ubicacion: i.ubicacion ?? null,
        horasActuales: toNum(i.horasActuales) ?? 0,
        estado: i.estado ?? 'normal',
        estadoOperativo: ['operativo', 'pausa', 'mantenimiento', 'montaje', 'fuera_servicio'].includes(i.estadoOperativo)
          ? i.estadoOperativo
          : 'operativo',
        temperaturaMin: toNum(i.temperaturaMin),
        temperaturaMax: toNum(i.temperaturaMax),
        temperaturaAlerta: toNum(i.temperaturaAlerta),
        temperaturaCritica: toNum(i.temperaturaCritica),
        amperajeNormal: toNum(i.amperajeNormal),
        amperajeAlerta: toNum(i.amperajeAlerta),
        amperajeCritico: toNum(i.amperajeCritico),
        presionNormal: toNum(i.presionNormal),
        presionAlerta: toNum(i.presionAlerta),
        presionCritica: toNum(i.presionCritica),
        voltajeMin: toNum(i.voltajeMin),
        voltajeMax: toNum(i.voltajeMax),
        voltajeAlerta: toNum(i.voltajeAlerta),
        bateriaAlerta: toNum(i.bateriaAlerta),
        bateriaCritica: toNum(i.bateriaCritica),
        tonerAlerta: toNum(i.tonerAlerta),
        tonerCritico: toNum(i.tonerCritico),
        intervaloMedicionHoras: toNum(i.intervaloMedicionHoras),
        intervaloLubricacionHoras: toNum(i.intervaloLubricacionHoras),
        intervaloRodamientoHoras: toNum(i.intervaloRodamientoHoras),
        proximoMantenimiento: toDate(i.proximoMantenimiento),
        notas: i.notas ?? null,
        visibilidadPublica: i.visibilidadPublica ?? undefined,
        esItinerante: !!i.esItinerante,
        locacionBase: i.locacionBase ?? null,
        locacionActual: i.locacionActual ?? null,
        fechaSalida: toDate(i.fechaSalida),
        fechaRetorno: toDate(i.fechaRetorno),
      };
      return prisma.activo.upsert({
        where: { id: i.id },
        create: { id: i.id, empresaId, ...data },
        update: data,
      });
    }),
    auditoriaSync(req, empresaId, 'activos', itemsValidos.length, deletedIds.length),
  ]);
  res.json({ synced: itemsValidos.length, deleted: deletedIds.length, descartados: items.length - itemsValidos.length });
}));

// ───────── Mediciones ─────────
router.put('/mediciones', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const { items, deletedIds } = payload(req);
  if (idsDuplicados(items)) return res.status(400).json({ error: 'Hay IDs de mediciones duplicados.' });
  const ids = items.map((i) => i.id);
  const existentes = ids.length
    ? await prisma.medicion.findMany({ where: { id: { in: ids } }, select: { id: true, activo: { select: { empresaId: true } } } })
    : [];
  if (existentes.some((item) => item.activo.empresaId !== empresaId)) {
    return res.status(403).json({ code: 'tenant_violation', error: 'Una medición pertenece a otra empresa.' });
  }
  const existentesIds = new Set(existentes.map((item) => item.id));
  const activoIds = [...new Set(items.map((i) => i.activoId).filter((id): id is string => typeof id === 'string'))];
  const activosValidos = activoIds.length
    ? await prisma.activo.findMany({
        where: { id: { in: activoIds }, empresaId },
        include: { tipo: { include: { categoria: { include: { parametros: true } } } } },
      })
    : [];
  const activosValidosIds = new Set(activosValidos.map((item) => item.id));
  const activosPorId = new Map(activosValidos.map((item) => [item.id, item]));
  if (items.some((item) => !activosValidosIds.has(item.activoId))) {
    return res.status(403).json({ code: 'tenant_violation', error: 'El activo de una medición no pertenece a esta empresa.' });
  }

  // Defensa: tecnicoId con ID que no es Usuario real rompe la FK y tira
  // la transaccion entera (se pierde TODO el sync). Mismo criterio que
  // responsableId en activos.
  const tecIds = items
    .map((i) => i.tecnicoId)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
  const usuariosOk = tecIds.length > 0
    ? await prisma.usuario.findMany({ where: { id: { in: tecIds }, empresaId }, select: { id: true } })
    : [];
  const tecnicosValidos = new Set(usuariosOk.map((u) => u.id));

  await prisma.$transaction([
    ...(deletedIds.length
      ? [prisma.medicion.deleteMany({ where: { activo: { empresaId }, id: { in: deletedIds } } })]
      : []),
    ...items.map((i) => {
      const activo = activosPorId.get(i.activoId)!;
      const estadoCalculado = peorEstado(
        calcularEstadoAutomatico(
          {
            temperatura: toNum(i.temperatura),
            amperaje: toNum(i.amperaje),
            presion: toNum(i.presion),
            voltaje: toNum(i.voltaje),
            porcentajeBateria: toNum(i.porcentajeBateria),
            nivelToner: toNum(i.nivelToner),
            vibracion: i.vibracion,
          },
          activo,
        ),
        calcularEstadoParametrosExtra(i.parametrosExtra, activo.tipo.categoria?.parametros ?? []),
      );
      const estadoAutomatico = estadoCalculado === 'urgente' || estadoCalculado === 'critico'
        ? 'urgente'
        : estadoCalculado === 'alerta'
          ? 'revision'
          : 'normal';
      const nivelEstado: Record<string, number> = { normal: 0, revision: 1, urgente: 2 };
      const estadoManual = ['normal', 'revision', 'urgente'].includes(i.estado) ? i.estado : 'normal';
      const data = {
        activoId: i.activoId,
        tecnicoId: typeof i.tecnicoId === 'string' && tecnicosValidos.has(i.tecnicoId) ? i.tecnicoId : null,
        fecha: toDate(i.fecha) ?? new Date(),
        temperatura: toNum(i.temperatura),
        amperaje: toNum(i.amperaje),
        presion: toNum(i.presion),
        vibracion: i.vibracion ?? 'ninguna',
        horasMarcha: toNum(i.horasMarcha),
        voltaje: toNum(i.voltaje),
        porcentajeBateria: toNum(i.porcentajeBateria) != null ? Math.round(toNum(i.porcentajeBateria)!) : null,
        nivelToner: toNum(i.nivelToner) != null ? Math.round(toNum(i.nivelToner)!) : null,
        contador: toNum(i.contador) != null ? Math.round(toNum(i.contador)!) : null,
        // Valores de parametros de categoria (pH, cloro, etc.) — sin esto,
        // todo lo que el usuario cargue en parametros custom se pierde.
        parametrosExtra:
          i.parametrosExtra && typeof i.parametrosExtra === 'object' && !Array.isArray(i.parametrosExtra)
            ? i.parametrosExtra
            : undefined,
        estado: nivelEstado[estadoManual] >= nivelEstado[estadoAutomatico] ? estadoManual : estadoAutomatico,
        observaciones: i.observaciones ?? null,
        origen: i.origen ?? 'manual',
      };
      const fotos = Array.isArray(i.fotos)
        ? i.fotos
            .map((foto: any) => typeof foto === 'string' ? { url: foto } : foto?.url ? { url: foto.url } : null)
            .filter(Boolean)
        : [];
      return prisma.medicion.upsert({
        where: { id: i.id },
        create: {
          id: i.id,
          ...data,
          ...(!existentesIds.has(i.id) && fotos.length ? { fotos: { create: fotos } } : {}),
        } as any,
        update: data,
      });
    }),
    auditoriaSync(req, empresaId, 'mediciones', items.length, deletedIds.length),
  ]);
  res.json({ synced: items.length, deleted: deletedIds.length });
}));

// ───────── Tareas ─────────
router.put('/tareas', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const { items, deletedIds } = payload(req);
  if (idsDuplicados(items)) return res.status(400).json({ error: 'Hay IDs de tareas duplicados.' });
  const ids = items.map((i) => i.id);
  const existentes = ids.length
    ? await prisma.tareaMantenimiento.findMany({ where: { id: { in: ids } }, select: { id: true, activo: { select: { empresaId: true } } } })
    : [];
  if (existentes.some((item) => item.activo.empresaId !== empresaId)) {
    return res.status(403).json({ code: 'tenant_violation', error: 'Una tarea pertenece a otra empresa.' });
  }
  const activoIds = [...new Set(items.map((i) => i.activoId).filter((id): id is string => typeof id === 'string'))];
  const activosValidos = activoIds.length
    ? await prisma.activo.findMany({ where: { id: { in: activoIds }, empresaId }, select: { id: true } })
    : [];
  const activosValidosIds = new Set(activosValidos.map((item) => item.id));
  if (items.some((item) => !activosValidosIds.has(item.activoId))) {
    return res.status(403).json({ code: 'tenant_violation', error: 'El activo de una tarea no pertenece a esta empresa.' });
  }
  const responsableIds = [...new Set(items.map((i) => i.responsableId).filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const responsablesValidos = responsableIds.length
    ? await prisma.usuario.findMany({ where: { id: { in: responsableIds }, empresaId, activo: true }, select: { id: true } })
    : [];
  const responsablesValidosIds = new Set(responsablesValidos.map((item) => item.id));
  await prisma.$transaction([
    ...(deletedIds.length
      ? [prisma.tareaMantenimiento.deleteMany({ where: { activo: { empresaId }, id: { in: deletedIds } } })]
      : []),
    ...items.map((i) => {
      const data = {
        activoId: i.activoId,
        responsableId: typeof i.responsableId === 'string' && responsablesValidosIds.has(i.responsableId)
          ? i.responsableId
          : null,
        tipo: i.tipo,
        fechaProgramada: toDate(i.fechaProgramada) ?? new Date(),
        fechaRealizada: toDate(i.fechaRealizada),
        estado: i.estado ?? 'pendiente',
        observaciones: i.observaciones ?? null,
        prioridad: i.prioridad ?? 'media',
        numero: toNum(i.numero),
        materiales: i.materiales ?? null,
        horasTrabajo: toNum(i.horasTrabajo),
        cerradaPor: i.cerradaPor ?? null,
        fotos: i.fotos ?? undefined,
      };
      return prisma.tareaMantenimiento.upsert({
        where: { id: i.id },
        create: { id: i.id, ...data },
        update: data,
      });
    }),
    auditoriaSync(req, empresaId, 'tareas', items.length, deletedIds.length),
  ]);
  res.json({ synced: items.length, deleted: deletedIds.length });
}));

export default router;
