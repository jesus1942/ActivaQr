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

// ───────── Técnicos ─────────
router.put('/tecnicos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.tecnico.deleteMany({ where: { empresaId, id: { notIn: ids } } })]
      : []),
    ...items.map((i) => {
      const data = {
        nombre: i.nombre,
        rol: i.rol ?? 'tecnico',
        email: i.email ?? null,
        telefono: i.telefono ?? null,
        activo: i.activo ?? true,
      };
      return prisma.tecnico.upsert({
        where: { id: i.id },
        create: { id: i.id, empresaId, ...data },
        update: data,
      });
    }),
  ]);
  res.json({ synced: items.length });
}));

// ───────── Activos ─────────
router.put('/activos', asyncHandler(async (req, res) => {
  const empresaId = await resolveEmpresaId(req);
  const items: any[] = Array.isArray(req.body) ? req.body : [];
  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    ...(ids.length
      ? [prisma.activo.deleteMany({ where: { empresaId, id: { notIn: ids } } })]
      : []),
    ...items.map((i) => {
      const data = {
        codigo: i.codigo,
        nombre: i.nombre,
        sectorId: i.sectorId,
        tipoId: i.tipoId,
        responsableId: i.responsableId ?? null,
        sedeId: i.sedeId ?? null,
        marca: i.marca ?? null,
        modelo: i.modelo ?? null,
        fechaIngreso: toDate(i.fechaIngreso) ?? new Date(),
        ubicacion: i.ubicacion ?? null,
        horasActuales: toNum(i.horasActuales) ?? 0,
        estado: i.estado ?? 'normal',
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
  res.json({ synced: items.length });
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
