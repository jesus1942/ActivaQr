import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import { getLimite } from '../planLimits';
import { auditar } from '../auditoria';
import { AuthRequest, requireGestionOperacion, requireJefatura } from '../auth';
import { bloquesExtra } from '../planCatalog';
import { actualizarMontoPreapproval } from '../mercadopago';
import { calcularPrecioPlanActual } from '../cotizacion';
import {
  enteroPositivo,
  estrategiaValida,
  siguienteLectura,
  sumarIntervaloCalendario,
  unidadMantenimientoValida,
} from '../mantenimiento';

const router = Router();

const ESTADOS_OPERATIVOS = ['operativo', 'pausa', 'mantenimiento', 'montaje', 'fuera_servicio'];

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
    kilometrosActuales,
    estrategiaMantenimiento,
    intervaloMantenimiento,
    unidadMantenimiento,
    proximoMantenimientoLectura,
    ultimaFechaMantenimiento,
    estado,
    estadoOperativo,
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
    visibilidadPublica,
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
    kilometrosActuales,
    estrategiaMantenimiento,
    intervaloMantenimiento,
    unidadMantenimiento,
    proximoMantenimientoLectura,
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

  if (visibilidadPublica !== undefined && visibilidadPublica !== null && typeof visibilidadPublica === 'object') {
    data.visibilidadPublica = visibilidadPublica;
  }

  // Estado operativo: solo persistir si es un valor válido.
  if (estadoOperativo !== undefined) {
    data.estadoOperativo = ESTADOS_OPERATIVOS.includes(estadoOperativo)
      ? estadoOperativo
      : 'operativo';
  }

  if (fechaIngreso !== undefined) data.fechaIngreso = new Date(fechaIngreso);
  if (ultimaFechaMantenimiento !== undefined) {
    data.ultimaFechaMantenimiento = ultimaFechaMantenimiento
      ? new Date(ultimaFechaMantenimiento)
      : null;
  }
  if (proximoMantenimiento !== undefined) {
    data.proximoMantenimiento = proximoMantenimiento
      ? new Date(proximoMantenimiento)
      : null;
  }

  // Quitar undefined para no pisar valores en updates parciales.
  Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
  return data;
}

function completarPlanMantenimiento(data: any, actual?: any) {
  const estrategia = estrategiaValida(
    data.estrategiaMantenimiento ?? actual?.estrategiaMantenimiento,
  );
  const intervalo = enteroPositivo(
    data.intervaloMantenimiento ?? actual?.intervaloMantenimiento,
  );
  const unidad = unidadMantenimientoValida(
    estrategia,
    data.unidadMantenimiento ?? actual?.unidadMantenimiento,
  );
  const cambioEstrategia = actual && estrategia !== actual.estrategiaMantenimiento;

  data.estrategiaMantenimiento = estrategia;
  data.intervaloMantenimiento = intervalo;
  data.unidadMantenimiento = unidad;
  if (estrategia === 'horas' || estrategia === 'kilometros') {
    data.proximoMantenimiento = null;
    const actualUso = estrategia === 'horas'
      ? Number(data.horasActuales ?? actual?.horasActuales ?? 0)
      : Number(data.kilometrosActuales ?? actual?.kilometrosActuales ?? 0);
    const proximo = enteroPositivo(
      data.proximoMantenimientoLectura ?? (
        cambioEstrategia ? null : actual?.proximoMantenimientoLectura
      ),
    );
    data.proximoMantenimientoLectura = proximo ?? (
      intervalo ? siguienteLectura(actualUso, intervalo) : null
    );
  } else {
    data.proximoMantenimientoLectura = null;
    const proximaActual = data.proximoMantenimiento ?? (
      cambioEstrategia ? null : actual?.proximoMantenimiento
    );
    if (!proximaActual && intervalo) {
      const base = data.ultimaFechaMantenimiento
        ?? actual?.ultimaFechaMantenimiento
        ?? new Date();
      data.proximoMantenimiento = sumarIntervaloCalendario(base, intervalo, unidad);
    }
  }
}

const includeRelaciones = {
  sector: true,
  tipo: {
    include: {
      categoria: {
        include: {
          parametros: { orderBy: { orden: 'asc' as const } },
        },
      },
    },
  },
  responsable: { select: { id: true, nombre: true, cargo: true } },
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
          include: { tecnico: { select: { id: true, nombre: true, cargo: true } }, fotos: true },
        },
        tareas: {
          orderBy: { fechaProgramada: 'asc' },
          include: { responsable: { select: { id: true, nombre: true, cargo: true } } },
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
router.post('/', requireGestionOperacion as any, async (req: Request, res: Response, next: NextFunction) => {
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
      select: {
        plan: true,
        mpEstadoSub: true,
        mpPreapprovalId: true,
        mpMonto: true,
        _count: { select: { activos: true } },
      },
    });
    if (empresa) {
      const limite = getLimite(empresa.plan);
      if (limite.activos !== null && empresa._count.activos >= limite.activos) {
        return res.status(403).json({
          code: 'limite_plan',
          error: `Tu plan "${empresa.plan}" permite hasta ${limite.activos} activos. Actualizá tu plan para agregar más.`,
        });
      }
      if (empresa.plan === 'industrial') {
        const actuales = empresa._count.activos;
        const bloqueActual = bloquesExtra('industrial', actuales);
        const bloqueNuevo = bloquesExtra('industrial', actuales + 1);
        if (bloqueNuevo > bloqueActual) {
          if (empresa.mpEstadoSub !== 'authorized' || !empresa.mpPreapprovalId || !empresa.mpMonto) {
            return res.status(403).json({
              code: 'recargo_requerido',
              error: 'Activá la suscripción Industrial para agregar el próximo bloque de 100 equipos.',
            });
          }
          try {
            const precioNuevo = await calcularPrecioPlanActual('industrial', actuales + 1, {
              forzarCotizacion: true,
            });
            await actualizarMontoPreapproval(
              empresa.mpPreapprovalId,
              precioNuevo.montoArs,
              `ActivaQR Industrial + ${bloqueNuevo} bloque(s) extra`
            );
            await prisma.empresa.update({
              where: { id: empresaId },
              data: {
                mpMonto: precioNuevo.montoArs,
                mpMontoUsd: precioNuevo.montoUsd,
                mpCotizacionUsdArs: precioNuevo.cotizacion.venta,
                mpCotizacionFuente: precioNuevo.cotizacion.fuente,
                mpCotizacionActualizadaEn: new Date(),
              },
            });
          } catch (error) {
            console.error('[ACTIVOS] No se pudo habilitar el bloque adicional:', error);
            return res.status(503).json({
              code: 'recargo_no_actualizado',
              error: 'No pudimos actualizar el abono. Intentá nuevamente o contactanos.',
            });
          }
        }
      }
    }

    if (!data.fechaIngreso) data.fechaIngreso = new Date();
    if (!data.estadoOperativo) data.estadoOperativo = 'operativo';
    completarPlanMantenimiento(data);

    // Defensa: normalizar strings vacios a null (el frontend manda '' como
    // default cuando no hay seleccion) y descartar IDs que no existen como
    // Usuario o Sede de esta empresa (el frontend tiene un store local viejo
    // de 'tecnicos' con IDs que ya no aplican). Sin esto: foreign key error.
    if (typeof data.responsableId !== 'string' || data.responsableId.trim() === '') {
      data.responsableId = null;
    } else {
      const u = await prisma.usuario.findFirst({ where: { id: data.responsableId, empresaId } });
      if (!u) data.responsableId = null;
    }
    if (typeof data.sedeId !== 'string' || data.sedeId.trim() === '') {
      data.sedeId = null;
    } else {
      const s = await prisma.sede.findFirst({ where: { id: data.sedeId, empresaId } });
      if (!s) data.sedeId = null;
    }

    const activo = await prisma.activo.create({
      data: { ...data, empresaId },
      include: includeRelaciones,
    });
    void auditar(req as AuthRequest, 'crear', 'activo', activo.id, `Activo ${activo.codigo} — ${activo.nombre}`);
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
router.put('/:id', requireGestionOperacion as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    const data = pickActivoData(req.body);
    completarPlanMantenimiento(data, existing);
    // Misma defensa que en POST.
    if (typeof data.responsableId !== 'string' || data.responsableId.trim() === '') {
      data.responsableId = null;
    } else {
      const u = await prisma.usuario.findFirst({ where: { id: data.responsableId, empresaId } });
      if (!u) data.responsableId = null;
    }
    if (typeof data.sedeId !== 'string' || data.sedeId.trim() === '') {
      data.sedeId = null;
    } else {
      const s = await prisma.sede.findFirst({ where: { id: data.sedeId, empresaId } });
      if (!s) data.sedeId = null;
    }
    const activo = await prisma.activo.update({
      where: { id: req.params.id },
      data,
      include: includeRelaciones,
    });
    void auditar(req as AuthRequest, 'editar', 'activo', activo.id, `Activo ${activo.codigo} — ${activo.nombre}`);
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

// DELETE /api/activos/:id — solo admin (no operador)
router.delete('/:id', requireJefatura as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    await prisma.activo.delete({ where: { id: req.params.id } });
    void auditar(req as AuthRequest, 'eliminar', 'activo', existing.id, `Activo ${existing.codigo} — ${existing.nombre}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ───────── Foto principal del activo ─────────
// Data URL JPEG/PNG/WebP comprimida en el cliente. Limite chico a proposito:
// si llega algo mas grande es que el cliente no comprimio (bug) o es abuso.
// Las fotos son evidencia tecnica: se suben a 1600 px con calidad alta para
// que se pueda leer un manometro o ver una fisura. Eso da 300-500 KB, que en
// base64 son 400-670 mil caracteres. El tope deja margen para fotos con mucho
// detalle sin abrir la puerta a subir archivos crudos de 8 MB.
const FOTO_MAX_CHARS = 2_000_000; // ~1,5 MB binario en base64
const FOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/activos/:id/foto
router.post('/:id/foto', requireGestionOperacion as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    const { url } = req.body ?? {};
    if (typeof url !== 'string' || !url.startsWith('data:')) {
      return res.status(400).json({ error: 'Falta la imagen (data URL).' });
    }
    const m = url.match(/^data:([^;,]+)[;,]/i);
    if (!m || !FOTO_MIMES.includes(m[1].toLowerCase())) {
      return res.status(415).json({ error: 'Formato no permitido. Solo JPEG, PNG o WebP.' });
    }
    if (url.length > FOTO_MAX_CHARS) {
      return res.status(413).json({ error: 'La imagen es demasiado grande. Reintenta (la app la comprime sola).' });
    }

    const activo = await prisma.activo.update({
      where: { id: existing.id },
      data: { fotoUrl: url },
      include: includeRelaciones,
    });
    void auditar(req as AuthRequest, 'editar', 'activo', activo.id, `Foto actualizada en ${activo.codigo}`);
    res.json(activo);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/activos/:id/foto
router.delete('/:id/foto', requireGestionOperacion as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.activo.findFirst({
      where: { id: req.params.id, empresaId },
    });
    if (!existing) return res.status(404).json({ error: 'Activo no encontrado' });

    await prisma.activo.update({ where: { id: existing.id }, data: { fotoUrl: null } });
    void auditar(req as AuthRequest, 'editar', 'activo', existing.id, `Foto eliminada en ${existing.codigo}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
