import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { resolveEmpresaId } from '../tenant';
import {
  calcularEstadoAutomatico,
  calcularEstadoParametrosExtra,
  estadoMedicionAActivo,
  peorEstado,
} from '../alertas';
import { enviarPushAEmpresa } from '../push';
import { auditar } from '../auditoria';
import { AuthRequest, requireAdmin } from '../auth';
import { registrarLecturaMantenimiento } from '../mantenimientoService';

const router = Router();

export function validarParametrosExtra(
  valores: unknown,
  parametros: Array<{
    nombre: string;
    clave: string;
    tipo: string;
    obligatorio: boolean;
    opciones: unknown;
  }>,
): string | null {
  const objeto = valores && typeof valores === 'object' && !Array.isArray(valores)
    ? valores as Record<string, unknown>
    : {};
  for (const parametro of parametros) {
    const valor = objeto[parametro.clave];
    const vacio = valor === undefined || valor === null || valor === '';
    if (parametro.obligatorio && vacio) {
      return `El campo "${parametro.nombre}" es obligatorio.`;
    }
    if (vacio) continue;
    if (
      (parametro.tipo === 'numerico' || parametro.tipo === 'porcentaje')
      && !Number.isFinite(Number(valor))
    ) {
      return `El campo "${parametro.nombre}" debe ser numérico.`;
    }
    if (
      parametro.tipo === 'booleano'
      && ![true, false, 'true', 'false'].includes(valor as boolean | string)
    ) {
      return `El campo "${parametro.nombre}" debe ser Sí o No.`;
    }
    if (parametro.tipo === 'seleccion' && Array.isArray(parametro.opciones)) {
      const permitido = parametro.opciones.some((opcion) => String(opcion) === String(valor));
      if (!permitido) return `La respuesta de "${parametro.nombre}" no es válida.`;
    }
  }
  return null;
}

// GET /api/mediciones?activoId=
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const activoId =
      typeof req.query.activoId === 'string' ? req.query.activoId : undefined;

    // Las fotos se guardan como data URL base64 dentro de la fila: incluirlas
    // en el listado completo hacia que la app descargara varios MB en cada
    // arranque, y crecia sin techo. Solo se envian al pedir un activo puntual.
    const mediciones = await prisma.medicion.findMany({
      where: {
        ...(activoId ? { activoId } : {}),
        activo: { empresaId }, // garantiza aislamiento multi-tenant
      },
      include: {
        tecnico: { select: { id: true, nombre: true, cargo: true } },
        ...(activoId ? { fotos: true } : {}),
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(mediciones);
  } catch (err) {
    next(err);
  }
});

// POST /api/mediciones
// Al crear, escala el estado del activo:
//   medición urgente  -> activo critico
//   medición revision -> activo alerta (solo si estaba normal)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      activoId,
      tecnicoId,
      fecha,
      temperatura,
      amperaje,
      presion,
      vibracion,
      horasMarcha,
      kilometraje,
      voltaje,
      porcentajeBateria,
      nivelToner,
      contador,
      estado,
      observaciones,
      origen,
      fotos,
      parametrosExtra,
    } = req.body ?? {};

    if (!activoId || typeof activoId !== 'string') {
      return res.status(400).json({ error: 'El campo "activoId" es obligatorio' });
    }

    const activo = await prisma.activo.findFirst({
      where: { id: activoId, empresaId },
      include: {
        tipo: {
          include: {
            categoria: { include: { parametros: true } },
          },
        },
      },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });
    const errorParametros = validarParametrosExtra(
      parametrosExtra,
      activo.tipo.categoria?.parametros ?? [],
    );
    if (errorParametros) return res.status(400).json({ error: errorParametros });
    const tecnicoValido = typeof tecnicoId === 'string' && tecnicoId
      ? await prisma.usuario.findFirst({ where: { id: tecnicoId, empresaId, activo: true }, select: { id: true } })
      : null;

    // Calcular estado automático a partir de umbrales del activo.
    // Si el técnico no envió estado (o envió 'normal'), lo calculamos.
    // Si envió 'urgente'/'critico', respetamos su criterio visual.
    const estadoCalculado = peorEstado(
      calcularEstadoAutomatico(
        {
          temperatura: activo.tipo.mideTemperatura ? temperatura : null,
          amperaje: activo.tipo.mideAmperaje ? amperaje : null,
          presion: activo.tipo.midePresion ? presion : null,
          voltaje: activo.tipo.mideVoltaje ? voltaje : null,
          porcentajeBateria: activo.tipo.mideBateria ? porcentajeBateria : null,
          nivelToner: activo.tipo.mideToner ? nivelToner : null,
          vibracion: activo.tipo.mideVibracion ? vibracion : null,
        },
        activo,
      ),
      calcularEstadoParametrosExtra(
        parametrosExtra && typeof parametrosExtra === 'object' && !Array.isArray(parametrosExtra)
          ? parametrosExtra
          : null,
        activo.tipo.categoria?.parametros ?? [],
      ),
    );
    // El estado final es el peor entre el calculado y el enviado por el técnico.
    const estadoAutomaticoPersistible: 'normal' | 'revision' | 'urgente' =
      estadoCalculado === 'urgente' || estadoCalculado === 'critico'
        ? 'urgente'
        : estadoCalculado === 'alerta'
          ? 'revision'
          : 'normal';
    const nivelPersistible: Record<string, number> = { normal: 0, revision: 1, urgente: 2 };
    const estadoManual = ['normal', 'revision', 'urgente'].includes(estado) ? estado : 'normal';
    const estadoFinal = nivelPersistible[estadoManual] >= nivelPersistible[estadoAutomaticoPersistible]
      ? estadoManual
      : estadoAutomaticoPersistible;

    // Fotos: aceptamos string (solo URL) o objeto con evidencia forense
    // (capturedLat, capturedLng, capturedAt, deviceModel, fuenteUbicacion).
    interface FotoCreateData {
      url: string;
      capturedLat: number | null;
      capturedLng: number | null;
      capturedAt: Date | null;
      deviceModel: string | null;
      fuenteUbicacion: string | null;
    }
    const fotosNormalizadas: FotoCreateData[] = Array.isArray(fotos)
      ? fotos
          .map((f: any): FotoCreateData | null => {
            const url = typeof f === 'string' ? f : (f?.url ?? null);
            if (typeof url !== 'string' || !url) return null;
            return {
              url,
              capturedLat: typeof f?.capturedLat === 'number' ? f.capturedLat : null,
              capturedLng: typeof f?.capturedLng === 'number' ? f.capturedLng : null,
              capturedAt: f?.capturedAt ? new Date(f.capturedAt) : null,
              deviceModel: f?.deviceModel ? String(f.deviceModel).slice(0, 80) : null,
              fuenteUbicacion: f?.fuenteUbicacion ? String(f.fuenteUbicacion).slice(0, 16) : null,
            };
          })
          .filter((x): x is FotoCreateData => x !== null)
      : [];
    const fotosCreate = fotosNormalizadas.length > 0 ? { create: fotosNormalizadas } : undefined;

    const medicion = await prisma.medicion.create({
      data: {
        activoId,
        tecnicoId: tecnicoValido?.id ?? null,
        fecha: fecha ? new Date(fecha) : undefined,
        temperatura: activo.tipo.mideTemperatura ? temperatura : null,
        amperaje: activo.tipo.mideAmperaje ? amperaje : null,
        presion: activo.tipo.midePresion ? presion : null,
        vibracion: activo.tipo.mideVibracion ? vibracion : 'ninguna',
        horasMarcha: activo.estrategiaMantenimiento === 'horas' || activo.tipo.mideHoras
          ? horasMarcha
          : null,
        kilometraje: activo.estrategiaMantenimiento === 'kilometros' ? kilometraje : null,
        voltaje: activo.tipo.mideVoltaje ? voltaje : null,
        porcentajeBateria: activo.tipo.mideBateria ? porcentajeBateria : null,
        nivelToner: activo.tipo.mideToner ? nivelToner : null,
        contador: activo.tipo.mideContador ? contador : null,
        estado: estadoFinal as any,
        observaciones,
        origen,
        parametrosExtra:
          parametrosExtra && typeof parametrosExtra === 'object' && !Array.isArray(parametrosExtra)
            ? parametrosExtra
            : undefined,
        ...(fotosCreate ? { fotos: fotosCreate } : {}),
      },
      include: { tecnico: { select: { id: true, nombre: true, cargo: true } }, fotos: true },
    });

    // Actualizar estado del activo automáticamente según la medición.
    const nuevoEstadoActivo = estadoMedicionAActivo(estadoCalculado);
    // Solo escalar (nunca bajar automáticamente — requiere revisión manual).
    const nivelActivo: Record<string, number> = { normal: 0, alerta: 1, mantenimiento: 1, critico: 2 };
    const nuevoEstado = (nivelActivo[nuevoEstadoActivo] ?? 0) > (nivelActivo[activo.estado] ?? 0)
      ? nuevoEstadoActivo
      : null;

    // Actualizar estado; las lecturas de mantenimiento se procesan abajo.
    const data: any = {};
    if (nuevoEstado) data.estado = nuevoEstado;
    if (Object.keys(data).length > 0) {
      await prisma.activo.update({ where: { id: activoId }, data });
    }
    await registrarLecturaMantenimiento(prisma, activo, {
      horasMarcha: medicion.horasMarcha,
      kilometraje: medicion.kilometraje,
    });

    // Crear tarea de mantenimiento automática cuando el activo escala a crítico o alerta,
    // pero solo si no hay ninguna tarea pendiente o vencida para ese activo.
    if (nuevoEstado === 'critico' || nuevoEstado === 'alerta') {
      const tareaExistente = await prisma.tareaMantenimiento.findFirst({
        where: { activoId, estado: { in: ['pendiente', 'vencido'] } },
      });
      if (!tareaExistente) {
        const tipoTarea = nuevoEstado === 'critico'
          ? 'Revision urgente — estado critico'
          : 'Revision — estado en alerta';
        await prisma.tareaMantenimiento.create({
          data: {
            activoId,
            tipo: tipoTarea,
            fechaProgramada: new Date(),
            estado: 'pendiente',
            responsableId: activo.responsableId ?? null,
            observaciones: `Generada automaticamente por medicion del ${new Date().toISOString().slice(0, 10)}`,
          },
        });
      }
    }

    // Notificar push cuando el activo escala a crítico o alerta.
    if (nuevoEstado === 'critico' || nuevoEstado === 'alerta') {
      enviarPushAEmpresa(
        activo.empresaId,
        {
          title: 'Alerta en ' + activo.nombre,
          body: 'Estado: ' + nuevoEstado + '. Codigo ' + activo.codigo,
          url: '#/activos/' + activo.id,
        },
        ['admin', 'operador'],
      ).catch((e) => console.error('[medicion] error push:', e));
    }

    void auditar(req as AuthRequest, 'medicion', 'medicion', medicion.id, `Medicion en ${activo.codigo} — estado ${estadoFinal}`);
    res.status(201).json(medicion);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mediciones/:id — solo admin (operador no puede borrar historial)
router.delete('/:id', requireAdmin as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.medicion.findFirst({
      where: { id: req.params.id, activo: { empresaId } },
    });
    if (!existing) return res.status(404).json({ error: 'Medición no encontrada' });

    await prisma.medicion.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
