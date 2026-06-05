import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { resolveEmpresaId } from '../tenant';

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

/**
 * Sincronización por entidad: el frontend envía el array completo.
 * Hacemos upsert de cada elemento y borramos los que ya no estén.
 * Por seguridad, si el array llega vacío NO borramos nada (evita
 * limpiar la base por una condición de carrera en la carga inicial).
 */

// ───────── Sectores ─────────
router.put('/sectores', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.sector.deleteMany({ where: { empresaId, id: { notIn: ids } } })]
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
  ]);
  res.json({ synced: items.length });
}));

// ───────── Tipos ─────────
router.put('/tipos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.tipoActivo.deleteMany({ where: { empresaId, id: { notIn: ids } } })]
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
  ]);
  res.json({ synced: items.length });
}));

// ───────── Personal (ex-tecnicos) — no-op: se gestionan via /api/operadores
router.put('/tecnicos', asyncHandler(async (_req, res) => {
  res.json({ synced: 0 });
}));

// ───────── Activos ─────────
router.put('/activos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);

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

  // Filtrar activos invalidos: sin sectorId o tipoId, los descartamos para
  // que un activo malo no tire toda la transaccion (y que el frontend al
  // menos sincronice el resto).
  const itemsValidos = items.filter((i) => {
    const sectorOk = typeof i.sectorId === 'string' && i.sectorId.trim().length > 0;
    const tipoOk = typeof i.tipoId === 'string' && i.tipoId.trim().length > 0;
    if (!sectorOk || !tipoOk) {
      console.warn('[sync/activos] descartando activo sin sectorId/tipoId:', i.id, i.codigo);
      return false;
    }
    return true;
  });
  const idsValidos = itemsValidos.map((i) => i.id);

  await prisma.$transaction([
    ...(idsValidos.length
      ? [prisma.activo.deleteMany({ where: { empresaId, id: { notIn: idsValidos } } })]
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
        presionNormal: toNum(i.presionNormal),
        intervaloMedicionHoras: toNum(i.intervaloMedicionHoras),
        intervaloLubricacionHoras: toNum(i.intervaloLubricacionHoras),
        intervaloRodamientoHoras: toNum(i.intervaloRodamientoHoras),
        proximoMantenimiento: toDate(i.proximoMantenimiento),
        notas: i.notas ?? null,
      };
      return prisma.activo.upsert({
        where: { id: i.id },
        create: { id: i.id, empresaId, ...data },
        update: data,
      });
    }),
  ]);
  res.json({ synced: itemsValidos.length, descartados: items.length - itemsValidos.length });
}));

// ───────── Mediciones ─────────
router.put('/mediciones', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.medicion.deleteMany({ where: { activo: { empresaId }, id: { notIn: ids } } })]
      : []),
    ...items.map((i) => {
      const data = {
        activoId: i.activoId,
        tecnicoId: i.tecnicoId ?? null,
        fecha: toDate(i.fecha) ?? new Date(),
        temperatura: toNum(i.temperatura),
        amperaje: toNum(i.amperaje),
        presion: toNum(i.presion),
        vibracion: i.vibracion ?? 'ninguna',
        horasMarcha: toNum(i.horasMarcha),
        estado: i.estado ?? 'normal',
        observaciones: i.observaciones ?? null,
        origen: i.origen ?? 'manual',
      };
      return prisma.medicion.upsert({
        where: { id: i.id },
        create: { id: i.id, ...data },
        update: data,
      });
    }),
  ]);
  res.json({ synced: items.length });
}));

// ───────── Tareas ─────────
router.put('/tareas', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.tareaMantenimiento.deleteMany({ where: { activo: { empresaId }, id: { notIn: ids } } })]
      : []),
    ...items.map((i) => {
      const data = {
        activoId: i.activoId,
        responsableId: i.responsableId ?? null,
        tipo: i.tipo,
        fechaProgramada: toDate(i.fechaProgramada) ?? new Date(),
        fechaRealizada: toDate(i.fechaRealizada),
        estado: i.estado ?? 'pendiente',
        observaciones: i.observaciones ?? null,
      };
      return prisma.tareaMantenimiento.upsert({
        where: { id: i.id },
        create: { id: i.id, ...data },
        update: data,
      });
    }),
  ]);
  res.json({ synced: items.length });
}));

export default router;
