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
import { AuthRequest, requireJefatura, requireTrabajoCampo } from '../auth';
import { registrarLecturaMantenimiento } from '../mantenimientoService';

const router = Router();

type CampoAnalitico = 'temperatura' | 'amperaje' | 'presion' | 'voltaje' | 'porcentajeBateria' | 'nivelToner';

const CAMPOS_ANALITICOS: Array<{ clave: CampoAnalitico; nombre: string; unidad: string; minimo: number }> = [
  { clave: 'temperatura', nombre: 'Temperatura', unidad: '°C', minimo: 1.5 },
  { clave: 'amperaje', nombre: 'Amperaje', unidad: ' A', minimo: 0.5 },
  { clave: 'presion', nombre: 'Presión', unidad: '', minimo: 0.2 },
  { clave: 'voltaje', nombre: 'Voltaje', unidad: ' V', minimo: 5 },
  { clave: 'porcentajeBateria', nombre: 'Batería', unidad: '%', minimo: 5 },
  { clave: 'nivelToner', nombre: 'Tóner', unidad: '%', minimo: 8 },
];

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 ? ordenados[mitad] : (ordenados[mitad - 1] + ordenados[mitad]) / 2;
}

function describirAnomalia(valor: number, historico: number[], campo: typeof CAMPOS_ANALITICOS[number]): string | null {
  if (historico.length < 5 || !Number.isFinite(valor)) return null;
  const centro = mediana(historico);
  const dispersion = mediana(historico.map((v) => Math.abs(v - centro)));
  const desvio = Math.abs(valor - centro);
  const minimo = Math.max(campo.minimo, Math.abs(centro) * 0.08);
  const score = dispersion > 1e-9 ? (0.6745 * desvio) / dispersion : desvio >= minimo ? 6 : 0;
  if (score < 4.5 || desvio < minimo) return null;
  return `${campo.nombre}: ${valor}${campo.unidad} (histórico reciente ~${centro.toFixed(1)}${campo.unidad})`;
}

async function detectarAnomaliasMedicion(activoId: string, medicion: any): Promise<string[]> {
  const historial = await prisma.medicion.findMany({
    where: { activoId, id: { not: medicion.id }, fecha: { lte: medicion.fecha } },
    orderBy: { fecha: 'desc' },
    take: 12,
    select: {
      temperatura: true,
      amperaje: true,
      presion: true,
      voltaje: true,
      porcentajeBateria: true,
      nivelToner: true,
    },
  });

  const anomalias: string[] = [];
  for (const campo of CAMPOS_ANALITICOS) {
    const actual = Number(medicion[campo.clave]);
    if (!Number.isFinite(actual)) continue;
    const valores = historial
      .map((m: any) => Number(m[campo.clave]))
      .filter((v: number) => Number.isFinite(v));
    const descripcion = describirAnomalia(actual, valores, campo);
    if (descripcion) anomalias.push(descripcion);
  }
  return anomalias;
}

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
    if (parametro.obligatorio && vacio) return `El campo "${parametro.nombre}" es obligatorio.`;
    if (vacio) continue;
    if ((parametro.tipo === 'numerico' || parametro.tipo === 'porcentaje') && !Number.isFinite(Number(valor))) {
      return `El campo "${parametro.nombre}" debe ser numérico.`;
    }
    if (parametro.tipo === 'booleano' && ![true, false, 'true', 'false'].includes(valor as boolean | string)) {
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
    const activoId = typeof req.query.activoId === 'string' ? req.query.activoId : undefined;
    const mediciones = await prisma.medicion.findMany({
      where: { ...(activoId ? { activoId } : {}), activo: { empresaId } },
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
router.post('/', requireTrabajoCampo as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const {
      activoId, tecnicoId, fecha, temperatura, amperaje, presion, vibracion,
      horasMarcha, kilometraje, voltaje, porcentajeBateria, nivelToner, contador,
      estado, observaciones, origen, fotos, parametrosExtra,
    } = req.body ?? {};

    if (!activoId || typeof activoId !== 'string') return res.status(400).json({ error: 'El campo "activoId" es obligatorio' });

    const activo = await prisma.activo.findFirst({
      where: { id: activoId, empresaId },
      include: { tipo: { include: { categoria: { include: { parametros: true } } } } },
    });
    if (!activo) return res.status(404).json({ error: 'Activo no encontrado' });

    const errorParametros = validarParametrosExtra(parametrosExtra, activo.tipo.categoria?.parametros ?? []);
    if (errorParametros) return res.status(400).json({ error: errorParametros });
    const tecnicoSolicitado = typeof tecnicoId === 'string' && tecnicoId ? tecnicoId : (req as AuthRequest).auth?.userId;
    const tecnicoValido = tecnicoSolicitado
      ? await prisma.usuario.findFirst({ where: { id: tecnicoSolicitado, empresaId, activo: true }, select: { id: true } })
      : null;

    const estadoCalculado = peorEstado(
      calcularEstadoAutomatico({
        temperatura: activo.tipo.mideTemperatura ? temperatura : null,
        amperaje: activo.tipo.mideAmperaje ? amperaje : null,
        presion: activo.tipo.midePresion ? presion : null,
        voltaje: activo.tipo.mideVoltaje ? voltaje : null,
        porcentajeBateria: activo.tipo.mideBateria ? porcentajeBateria : null,
        nivelToner: activo.tipo.mideToner ? nivelToner : null,
        vibracion: activo.tipo.mideVibracion ? vibracion : null,
      }, activo),
      calcularEstadoParametrosExtra(
        parametrosExtra && typeof parametrosExtra === 'object' && !Array.isArray(parametrosExtra) ? parametrosExtra : null,
        activo.tipo.categoria?.parametros ?? [],
      ),
    );

    const estadoAutomaticoPersistible: 'normal' | 'revision' | 'urgente' =
      estadoCalculado === 'urgente' || estadoCalculado === 'critico' ? 'urgente'
      : estadoCalculado === 'alerta' ? 'revision' : 'normal';
    const nivelPersistible: Record<string, number> = { normal: 0, revision: 1, urgente: 2 };
    const estadoManual = ['normal', 'revision', 'urgente'].includes(estado) ? estado : 'normal';
    const estadoFinal = nivelPersistible[estadoManual] >= nivelPersistible[estadoAutomaticoPersistible]
      ? estadoManual : estadoAutomaticoPersistible;

    interface FotoCreateData {
      url: string;
      capturedLat: number | null;
      capturedLng: number | null;
      capturedAt: Date | null;
      deviceModel: string | null;
      fuenteUbicacion: string | null;
    }
    const fotosNormalizadas: FotoCreateData[] = Array.isArray(fotos)
      ? fotos.map((f: any): FotoCreateData | null => {
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
        }).filter((x): x is FotoCreateData => x !== null)
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
        horasMarcha: activo.estrategiaMantenimiento === 'horas' || activo.tipo.mideHoras ? horasMarcha : null,
        kilometraje: activo.estrategiaMantenimiento === 'kilometros' ? kilometraje : null,
        voltaje: activo.tipo.mideVoltaje ? voltaje : null,
        porcentajeBateria: activo.tipo.mideBateria ? porcentajeBateria : null,
        nivelToner: activo.tipo.mideToner ? nivelToner : null,
        contador: activo.tipo.mideContador ? contador : null,
        estado: estadoFinal as any,
        observaciones,
        origen,
        parametrosExtra: parametrosExtra && typeof parametrosExtra === 'object' && !Array.isArray(parametrosExtra) ? parametrosExtra : undefined,
        ...(fotosCreate ? { fotos: fotosCreate } : {}),
      },
      include: { tecnico: { select: { id: true, nombre: true, cargo: true } }, fotos: true },
    });

    const nuevoEstadoActivo = estadoMedicionAActivo(estadoCalculado);
    const nivelActivo: Record<string, number> = { normal: 0, alerta: 1, mantenimiento: 1, critico: 2 };
    const nuevoEstado = (nivelActivo[nuevoEstadoActivo] ?? 0) > (nivelActivo[activo.estado] ?? 0) ? nuevoEstadoActivo : null;

    const data: any = {};
    if (nuevoEstado) data.estado = nuevoEstado;
    if (Object.keys(data).length > 0) await prisma.activo.update({ where: { id: activoId }, data });
    await registrarLecturaMantenimiento(prisma, activo, {
      horasMarcha: medicion.horasMarcha,
      kilometraje: medicion.kilometraje,
    });

    const anomaliasInteligentes = await detectarAnomaliasMedicion(activoId, medicion);

    if (nuevoEstado === 'critico' || nuevoEstado === 'alerta') {
      const tareaExistente = await prisma.tareaMantenimiento.findFirst({
        where: { activoId, estado: { in: ['pendiente', 'vencido'] } },
      });
      if (!tareaExistente) {
        const tipoTarea = nuevoEstado === 'critico' ? 'Revision urgente — estado critico' : 'Revision — estado en alerta';
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

    if (nuevoEstado === 'critico' || nuevoEstado === 'alerta') {
      enviarPushAEmpresa(activo.empresaId, {
        title: 'Alerta en ' + activo.nombre,
        body: 'Estado: ' + nuevoEstado + '. Codigo ' + activo.codigo,
        url: '#/activos/' + activo.id,
        severity: nuevoEstado === 'critico' ? 'critical' : 'warning',
        tag: `estado-${activo.id}`,
      }, ['admin', 'operador', 'tecnico', 'mantenimiento', 'jefatura', 'direccion'])
        .catch((e) => console.error('[medicion] error push:', e));
    } else if (anomaliasInteligentes.length > 0) {
      enviarPushAEmpresa(activo.empresaId, {
        title: 'Anomalía detectada en ' + activo.nombre,
        body: anomaliasInteligentes.slice(0, 2).join(' · '),
        url: '#/activos/' + activo.id,
        severity: 'warning',
        tag: `anomalia-${activo.id}`,
      }, ['admin', 'operador', 'tecnico', 'mantenimiento', 'jefatura', 'direccion'])
        .catch((e) => console.error('[medicion] error push anomalia:', e));
      void auditar(req as AuthRequest, 'anomalia', 'activo', activo.id, `Anomalia estadistica: ${anomaliasInteligentes.join(' | ')}`);
    }

    void auditar(req as AuthRequest, 'medicion', 'medicion', medicion.id, `Medicion en ${activo.codigo} — estado ${estadoFinal}`);
    res.status(201).json(medicion);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireJefatura as any, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const empresaId = await resolveEmpresaId(req);
    const existing = await prisma.medicion.findFirst({ where: { id: req.params.id, activo: { empresaId } } });
    if (!existing) return res.status(404).json({ error: 'Medición no encontrada' });
    await prisma.medicion.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
