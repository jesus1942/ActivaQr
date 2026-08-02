export type NivelAlerta = 'desmejorado' | 'riesgo' | 'critico';
export type EstadoOrden = 'autorizada' | 'programada' | 'en_progreso' | 'completada' | 'cancelada';
export type EstadoPermiso = 'no_requerido' | 'pendiente' | 'aprobado' | 'rechazado' | 'vencido';

export const CONDICIONES_CORRECTIVAS = [
  'El servicio gestionado comprende la toma de mediciones, evaluación del estado del equipo, registro de evidencias y emisión de alertas y recomendaciones técnicas.',
  'No incluye tareas de mantenimiento correctivo, repuestos, materiales ni mano de obra adicional.',
  'Ninguna intervención correctiva será ejecutada sin la aceptación expresa de esta cotización por un administrador autorizado de la empresa cliente y la correspondiente orden de trabajo.',
  'Cuando el establecimiento lo requiera, la ejecución quedará además condicionada a un permiso de trabajo vigente y aprobado por el cliente.',
  'Ante una condición crítica, ActivaQR podrá recomendar la detención o aislamiento preventivo del equipo. La decisión operativa corresponde al cliente y queda registrada en la plataforma.',
] as const;

const NIVEL: Record<NivelAlerta, number> = { desmejorado: 1, riesgo: 2, critico: 3 };

export function nivelDesdeMedicion(
  estado: string,
  solicitado?: unknown,
): NivelAlerta | null {
  const automatico: NivelAlerta | null = estado === 'urgente'
    ? 'critico'
    : estado === 'revision'
      ? 'desmejorado'
      : null;
  if (!automatico) return null;
  const manual = typeof solicitado === 'string' && solicitado in NIVEL
    ? solicitado as NivelAlerta
    : automatico;
  return NIVEL[manual] >= NIVEL[automatico] ? manual : automatico;
}

function texto(valor: unknown, nombre: string, maximo: number, requerido = true): string | null {
  const resultado = typeof valor === 'string' ? valor.trim().slice(0, maximo) : '';
  if (requerido && !resultado) throw new Error(`${nombre} es obligatorio.`);
  return resultado || null;
}

function numero(valor: unknown, nombre: string, maximo: number, predeterminado = 0): number {
  const convertido = valor === '' || valor === null || valor === undefined
    ? predeterminado
    : Number(valor);
  if (!Number.isFinite(convertido) || convertido < 0 || convertido > maximo) {
    throw new Error(`${nombre} debe estar entre 0 y ${maximo}.`);
  }
  return convertido;
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export interface PropuestaCorrectiva {
  alcance: string;
  materialesPrevistos: string | null;
  condicionesSeguridad: string | null;
  manoObra: number;
  repuestos: number;
  traslado: number;
  otros: number;
  subtotal: number;
  descuento: number;
  total: number;
  descuentoPorcentaje: number;
  vigenciaDias: number;
  plazoEstimadoDias: number;
  requierePermiso: boolean;
}

export function calcularPropuestaCorrectiva(entrada: Record<string, unknown>): PropuestaCorrectiva {
  const manoObra = numero(entrada.manoObra, 'Mano de obra', 1_000_000_000);
  const repuestos = numero(entrada.repuestos, 'Repuestos', 1_000_000_000);
  const traslado = numero(entrada.traslado, 'Traslado', 1_000_000_000);
  const otros = numero(entrada.otros, 'Otros costos', 1_000_000_000);
  const descuentoPorcentaje = numero(entrada.descuento, 'Descuento', 100);
  const vigenciaDias = numero(entrada.vigenciaDias, 'Vigencia', 180, 15);
  const plazoEstimadoDias = numero(entrada.plazoEstimadoDias, 'Plazo estimado', 365, 1);
  if (!Number.isInteger(vigenciaDias) || vigenciaDias < 1) {
    throw new Error('Vigencia debe ser un número entero de al menos 1 día.');
  }
  if (!Number.isInteger(plazoEstimadoDias) || plazoEstimadoDias < 1) {
    throw new Error('Plazo estimado debe ser un número entero de al menos 1 día.');
  }
  const subtotal = manoObra + repuestos + traslado + otros;
  if (subtotal <= 0) throw new Error('La propuesta debe tener un importe mayor a cero.');
  const descuento = subtotal * descuentoPorcentaje / 100;
  return {
    alcance: texto(entrada.alcance, 'El alcance', 4_000)!,
    materialesPrevistos: texto(entrada.materialesPrevistos, 'Los materiales previstos', 4_000, false),
    condicionesSeguridad: texto(entrada.condicionesSeguridad, 'Las condiciones de seguridad', 4_000, false),
    manoObra: redondear(manoObra),
    repuestos: redondear(repuestos),
    traslado: redondear(traslado),
    otros: redondear(otros),
    subtotal: redondear(subtotal),
    descuento: redondear(descuento),
    total: redondear(subtotal - descuento),
    descuentoPorcentaje,
    vigenciaDias,
    plazoEstimadoDias,
    requierePermiso: entrada.requierePermiso !== false,
  };
}

export function puedeEjecutarse(estadoOrden: EstadoOrden, estadoPermiso: EstadoPermiso): boolean {
  return ['autorizada', 'programada', 'en_progreso'].includes(estadoOrden)
    && ['no_requerido', 'aprobado'].includes(estadoPermiso);
}

const TRANSICIONES: Record<EstadoOrden, EstadoOrden[]> = {
  autorizada: ['programada', 'cancelada'],
  programada: ['en_progreso', 'cancelada'],
  en_progreso: ['completada'],
  completada: [],
  cancelada: [],
};

export function validarTransicionOrden(actual: EstadoOrden, siguiente: EstadoOrden): void {
  if (!TRANSICIONES[actual]?.includes(siguiente)) {
    throw new Error(`No se puede pasar una orden de ${actual} a ${siguiente}.`);
  }
}

export function textosAlerta(nivel: NivelAlerta, activo: { codigo: string; nombre: string }, observaciones?: unknown) {
  const hallazgo = typeof observaciones === 'string' && observaciones.trim()
    ? observaciones.trim().slice(0, 4_000)
    : `La medición de ${activo.codigo} · ${activo.nombre} registró valores fuera de los parámetros configurados.`;
  if (nivel === 'critico') {
    return {
      hallazgo,
      riesgo: 'Condición crítica con riesgo elevado de falla, daño progresivo o salida imprevista de servicio.',
      recomendacion: 'Detener o aislar preventivamente el equipo y solicitar diagnóstico correctivo autorizado.',
      recomiendaDetencion: true,
    };
  }
  if (nivel === 'riesgo') {
    return {
      hallazgo,
      riesgo: 'La desviación observada puede evolucionar hacia una falla o rotura si el equipo continúa sin revisión.',
      recomendacion: 'Programar diagnóstico y propuesta correctiva antes de continuar el ciclo normal de operación.',
      recomiendaDetencion: false,
    };
  }
  return {
    hallazgo,
    riesgo: 'Se observa deterioro o desviación respecto del funcionamiento esperado, todavía sin condición crítica confirmada.',
    recomendacion: 'Revisar el equipo y definir si corresponde mantenimiento correctivo.',
    recomiendaDetencion: false,
  };
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
});

export function armarTextoCorrectivo(params: {
  numero: string;
  clienteNombre: string;
  activoCodigo: string;
  activoNombre: string;
  alertaNumero: string;
  nivel: NivelAlerta;
  hallazgo: string;
  riesgo: string;
  recomendacion: string;
  detalle: PropuestaCorrectiva;
  vigenciaHasta: Date;
}): string {
  const descuento = params.detalle.descuento > 0
    ? `\nDescuento: -${ARS.format(params.detalle.descuento)}`
    : '';
  return [
    `COTIZACIÓN ${params.numero} — TRABAJO CORRECTIVO`,
    `Cliente: ${params.clienteNombre}`,
    `Equipo: ${params.activoCodigo} · ${params.activoNombre}`,
    `Alerta: ${params.alertaNumero} · ${params.nivel.toUpperCase()}`,
    `Hallazgo: ${params.hallazgo}`,
    `Riesgo: ${params.riesgo}`,
    `Recomendación: ${params.recomendacion}`,
    '',
    `Alcance propuesto: ${params.detalle.alcance}`,
    params.detalle.materialesPrevistos ? `Materiales previstos: ${params.detalle.materialesPrevistos}` : '',
    `Plazo estimado: ${params.detalle.plazoEstimadoDias} día(s)`,
    `Subtotal: ${ARS.format(params.detalle.subtotal)}${descuento}`,
    `TOTAL: ${ARS.format(params.detalle.total)}`,
    `Válida hasta: ${params.vigenciaHasta.toLocaleDateString('es-AR')}`,
    params.detalle.requierePermiso
      ? 'Requiere permiso de trabajo aprobado por la empresa antes de programar o iniciar.'
      : 'No requiere permiso de trabajo adicional según el alcance informado.',
    params.detalle.condicionesSeguridad ? `Condiciones de seguridad: ${params.detalle.condicionesSeguridad}` : '',
    '',
    ...CONDICIONES_CORRECTIVAS,
  ].filter(Boolean).join('\n');
}
