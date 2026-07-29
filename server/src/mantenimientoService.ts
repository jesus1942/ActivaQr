import { PrismaClient } from '@prisma/client';
import {
  descripcionVencimiento,
  mantenimientoVencido,
  siguienteLectura,
  sumarIntervaloCalendario,
} from './mantenimiento';

type PrismaLike = Pick<PrismaClient, 'activo' | 'tareaMantenimiento'>;

export async function registrarLecturaMantenimiento(
  prisma: PrismaLike,
  activo: {
    id: string;
    responsableId: string | null;
    estrategiaMantenimiento: string;
    horasActuales: number;
    kilometrosActuales: number;
    proximoMantenimientoLectura: number | null;
    proximoMantenimiento: Date | null;
  },
  lectura: { horasMarcha?: number | null; kilometraje?: number | null },
): Promise<void> {
  const data: { horasActuales?: number; kilometrosActuales?: number } = {};
  if (
    typeof lectura.horasMarcha === 'number'
    && lectura.horasMarcha > activo.horasActuales
  ) {
    data.horasActuales = Math.round(lectura.horasMarcha);
  }
  if (
    typeof lectura.kilometraje === 'number'
    && lectura.kilometraje > activo.kilometrosActuales
  ) {
    data.kilometrosActuales = Math.round(lectura.kilometraje);
  }

  const actualizado = Object.keys(data).length
    ? await prisma.activo.update({ where: { id: activo.id }, data })
    : activo;
  if (!mantenimientoVencido(actualizado)) return;

  const pendiente = await prisma.tareaMantenimiento.findFirst({
    where: {
      activoId: activo.id,
      estado: { in: ['pendiente', 'vencido'] },
      tipo: { startsWith: 'Mantenimiento preventivo automático' },
    },
    select: { id: true },
  });
  if (pendiente) return;

  await prisma.tareaMantenimiento.create({
    data: {
      activoId: activo.id,
      tipo: `Mantenimiento preventivo automático — ${descripcionVencimiento(actualizado)}`,
      prioridad: 'alta',
      fechaProgramada: new Date(),
      estado: 'pendiente',
      responsableId: activo.responsableId,
      observaciones: 'Generado automáticamente al alcanzar el vencimiento configurado del activo.',
    },
  });
}

export function siguienteCicloMantenimiento(
  activo: {
    estrategiaMantenimiento: string;
    intervaloMantenimiento: number | null;
    unidadMantenimiento: string | null;
    horasActuales: number;
    kilometrosActuales: number;
  },
  fechaRealizada = new Date(),
) {
  const intervalo = activo.intervaloMantenimiento;
  if (!intervalo || intervalo <= 0) return null;
  if (activo.estrategiaMantenimiento === 'horas') {
    return {
      ultimaFechaMantenimiento: fechaRealizada,
      proximoMantenimientoLectura: siguienteLectura(activo.horasActuales, intervalo),
    };
  }
  if (activo.estrategiaMantenimiento === 'kilometros') {
    return {
      ultimaFechaMantenimiento: fechaRealizada,
      proximoMantenimientoLectura: siguienteLectura(activo.kilometrosActuales, intervalo),
    };
  }
  return {
    ultimaFechaMantenimiento: fechaRealizada,
    proximoMantenimiento: sumarIntervaloCalendario(
      fechaRealizada,
      intervalo,
      activo.unidadMantenimiento ?? 'meses',
    ),
  };
}
