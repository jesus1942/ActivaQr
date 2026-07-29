export type EstrategiaMantenimiento = 'horas' | 'kilometros' | 'fecha';
export type UnidadCalendario = 'dias' | 'semanas' | 'meses';

const ESTRATEGIAS = new Set<EstrategiaMantenimiento>(['horas', 'kilometros', 'fecha']);
const UNIDADES_FECHA = new Set<UnidadCalendario>(['dias', 'semanas', 'meses']);

export function estrategiaValida(value: unknown): EstrategiaMantenimiento {
  return ESTRATEGIAS.has(value as EstrategiaMantenimiento)
    ? value as EstrategiaMantenimiento
    : 'fecha';
}

export function unidadMantenimientoValida(
  estrategia: EstrategiaMantenimiento,
  value: unknown,
): string {
  if (estrategia === 'horas') return 'horas';
  if (estrategia === 'kilometros') return 'kilometros';
  return UNIDADES_FECHA.has(value as UnidadCalendario)
    ? value as UnidadCalendario
    : 'meses';
}

export function enteroPositivo(value: unknown): number | null {
  const numero = Number(value);
  return Number.isFinite(numero) && numero > 0 ? Math.round(numero) : null;
}

export function sumarIntervaloCalendario(
  fechaBase: Date,
  intervalo: number,
  unidad: string,
): Date {
  const fecha = new Date(fechaBase);
  if (unidad === 'dias') fecha.setUTCDate(fecha.getUTCDate() + intervalo);
  else if (unidad === 'semanas') fecha.setUTCDate(fecha.getUTCDate() + intervalo * 7);
  else {
    // Evita que fechas como 31/01 salten hasta marzo al sumar un mes.
    // Primero nos movemos al día 1 del mes destino y luego restauramos el
    // día original, limitado al último día que realmente existe allí.
    const diaOriginal = fecha.getUTCDate();
    fecha.setUTCDate(1);
    fecha.setUTCMonth(fecha.getUTCMonth() + intervalo);
    const ultimoDiaDestino = new Date(Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    fecha.setUTCDate(Math.min(diaOriginal, ultimoDiaDestino));
  }
  return fecha;
}

export function siguienteLectura(actual: number, intervalo: number): number {
  return Math.max(0, Math.round(actual)) + Math.max(1, Math.round(intervalo));
}

export function mantenimientoVencido(activo: {
  estrategiaMantenimiento: string;
  horasActuales: number;
  kilometrosActuales: number;
  proximoMantenimientoLectura: number | null;
  proximoMantenimiento: Date | null;
}, ahora = new Date()): boolean {
  if (activo.estrategiaMantenimiento === 'horas') {
    return activo.proximoMantenimientoLectura != null
      && activo.horasActuales >= activo.proximoMantenimientoLectura;
  }
  if (activo.estrategiaMantenimiento === 'kilometros') {
    return activo.proximoMantenimientoLectura != null
      && activo.kilometrosActuales >= activo.proximoMantenimientoLectura;
  }
  return activo.proximoMantenimiento != null
    && activo.proximoMantenimiento.getTime() <= ahora.getTime();
}

export function descripcionVencimiento(activo: {
  estrategiaMantenimiento: string;
  proximoMantenimientoLectura: number | null;
  proximoMantenimiento: Date | null;
}): string {
  if (activo.estrategiaMantenimiento === 'horas') {
    return `${activo.proximoMantenimientoLectura ?? 0} horas`;
  }
  if (activo.estrategiaMantenimiento === 'kilometros') {
    return `${activo.proximoMantenimientoLectura ?? 0} km`;
  }
  return activo.proximoMantenimiento?.toISOString().slice(0, 10) ?? 'fecha programada';
}
