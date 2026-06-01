import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { getLimite } from '../planLimits';

const router = Router();

// Campos que se aceptan para crear/actualizar un activo.
function pickActivoData(body: any) {
  const {
    sedeId,
    sectorId,
    tipoId,
    responsableId,
    codigo,
    nombre,
    marca,
    modelo,
    fechaIngreso,
    ubicacion,
    horasActuales,
    estado,
    temperaturaMin,
    temperaturaMax,
    temperaturaAlerta,
    temperaturaCritica,
    amperajeNormal,
    amperajeAlerta,
    amperajeCritico,
    presionNormal,
    presionAlerta,
    presionCritica,
    voltajeMin,
    voltajeMax,
    voltajeAlerta,
    bateriaAlerta,
    bateriaCritica,
    tonerAlerta,
    tonerCritico,
    intervaloMedicionHoras,
    intervaloLubricacionHoras,
    intervaloRodamientoHoras,
    proximoMantenimiento,
    notas,
  } = body ?? {};

  const data: any = {
    sedeId,
    sectorId,
    tipoId,
    responsableId,
    codigo,
    nombre,
    marca,
    modelo,
    ubicacion,
    horasActuales,
    estado,
    temperaturaMin,
    temperaturaMax,
    temperaturaAlerta,
    temperaturaCritica,
    amperajeNormal,
    amperajeAlerta,
    amperajeCritico,
    presionNormal,
    presionAlerta,
    presionCritica,
    voltajeMin,
    voltajeMax,
    voltajeAlerta,
    bateriaAlerta,
    bateriaCritica,
    tonerAlerta,
    tonerCritico,
    intervaloMedicionHoras,
    intervaloLubricacionHoras,
    intervaloRodamientoHoras,
    notas,
  };

  if (fechaIngreso !== undefined) data.fechaIngreso = new Date(fechaIngreso);
  if (proximoMantenimiento !== undefined) {
    data.proximoMantenimiento = proximoMantenimiento
      ? new Date(proximoMantenimiento)
      : null;
  }

  // Quitar undefined para no pisar valores en updates parciales.
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  return data;
}

const includeRelaciones = {
  sector: true,
  tipo: true,
  responsable: true,
  sede: true,
};

// GET /api/activos  con filtros ?sectorId=&tipoId=&estado=&q=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const { sectorId, tipoId, estado, q } = req.query;

    const where: Prisma.ActivoWhereInput = { empresaId };
    if (typeof sectorId === 'string' && sectorId) where.sectorId = sectorId;
    if (typeof tipoId === 'string' && tipoId) where.tipoId = tipoId;
    if (typeof estado === 'string' && estado) {
      where.estado = estado as Prisma.ActivoWhereInput['estado'];
    }
    if (typeof q === 'string' && q) {
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
        { modelo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const activos = await prisma.activo.findMany({
      where,
      include: includeRelaciones,
      orderBy: { codigo: 'asc' },
    });
    res.json(activos);
  } catch (err) {
    next(err);
  }
});

// GET /api/activos/:id  — incluye mediciones y tareas
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const activo = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
      include: {
        ...includeRelaciones,
        mediciones: {
          orderBy: { fecha: 'desc' },
          include: { tecnico: true, fotos: true },
        },
        tareas: {
          orderBy: { fechaProgramada: 'asc' },
          include: { responsable: true },
        },
      },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });
    res.json(activo);
  } catch (err) {
    next(err);
  }
});

// POST /api/activos
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const data = pickActivoData(req.body);

    if (!data.codigo || !data.nombre || !data.sectorId || !data.tipoId) {
      return res.status(400).json({
        error: 'Los campos "codigo", "nombre", "sectorId" y "tipoId" son obligatorios',
      });
    }

    // Verificar límite de activos del plan.
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { plan: true, _count: { select: { activos: true } } },
    });
    if (empresa) {
      const limite = getLimite(empresa.plan);
      if (limite.activos !== null && empresa._count.activos >= limite.activos) {
        return res.status(403).json({
          code: 'limite_plan',
          error: `Tu plan "${empresa.plan}" permite hasta ${limite.activos} activos. Actualizá tu plan para agregar más.`,
        });
      }
    }

    if (!data.fechaIngreso) data.fechaIngreso = new Date();

    const activo = await prisma.activo.create({
      data: { ...data, empresaId },
      include: includeRelaciones,
    });
    res.status(201).json(activo);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res
        .status(400)
        .json({ error: 'Ya existe un activo con ese código en la empresa' });
    }
    next(err);
  }
});

// PUT /api/activos/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    const data = pickActivoData(req.body);
    const activo = await prisma.activo.update({
      where: { id: req.params.id },
      data,
      include: includeRelaciones,
    });
    res.json(activo);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res
        .status(400)
        .json({ error: 'Ya existe un activo con ese código en la empresa' });
    }
    next(err);
  }
});

// DELETE /api/activos/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    await prisma.activo.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
