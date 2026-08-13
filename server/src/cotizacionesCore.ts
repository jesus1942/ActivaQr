export interface DetalleCotizacionGestionada {
  activos: number;
  visitasMes: number;
  horasVisita: number;
  valorHora: number;
  valorActivo: number;
  kilometrosVisita: number;
  valorKilometro: number;
  viaticosVisita: number;
  extrasMensuales: number;
  descuentoPorcentaje: number;
  porVisita: number;
  notas: string | null;
}

export interface CotizacionCalculada {
  concepto: string;
  planSoftware: 'inicial' | 'empresa' | 'industrial';
  detalle: DetalleCotizacionGestionada;
  subtotal: number;
  descuento: number;
  total: number;
  vigenciaDias: number;
}

export interface DetalleCotizacionActivaControl {
  dispositivos: number;
  costoReferenciaDispositivo: number;
  precioInstaladoDispositivo: number;
  extrasImplementacion: number;
  cargoInicial: number;
  abonoPorDispositivo: number;
  abonoMinimoMensual: number;
  abonoMensual: number;
  retencionDias: number;
  incluyeAlertas: boolean;
  incluyeControlRemoto: boolean;
  notas: string | null;
}

export interface CotizacionActivaControlCalculada {
  concepto: string;
  planSoftware: 'industrial';
  detalle: DetalleCotizacionActivaControl;
  subtotal: number;
  descuento: number;
  total: number;
  vigenciaDias: number;
}

const PLANES = new Set(['inicial', 'empresa', 'industrial']);

function numero(
  valor: unknown,
  nombre: string,
  maximo: number,
  predeterminado = 0,
): number {
  const convertido = valor === undefined || valor === null || valor === ''
    ? predeterminado
    : Number(valor);
  if (!Number.isFinite(convertido) || convertido < 0 || convertido > maximo) {
    throw new Error(`${nombre} debe estar entre 0 y ${maximo}.`);
  }
  return convertido;
}

function entero(valor: unknown, nombre: string, maximo: number, predeterminado: number): number {
  const convertido = numero(valor, nombre, maximo, predeterminado);
  if (!Number.isInteger(convertido)) throw new Error(`${nombre} debe ser un número entero.`);
  return convertido;
}

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  return valor.trim().slice(0, maximo);
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function calcularCotizacionGestionada(entrada: Record<string, unknown>): CotizacionCalculada {
  const planCrudo = typeof entrada.planSoftware === 'string' ? entrada.planSoftware : 'empresa';
  if (!PLANES.has(planCrudo)) throw new Error('El plan de software no es válido.');

  const activos = entero(entrada.activos, 'Equipos', 10_000, 10);
  const visitasMes = entero(entrada.visitasMes, 'Visitas por mes', 100, 1);
  const horasVisita = numero(entrada.horasVisita, 'Horas por visita', 1_000, 4);
  const valorHora = numero(entrada.valorHora, 'Valor por hora', 1_000_000_000);
  const valorActivo = numero(entrada.valorActivo, 'Valor por equipo', 1_000_000_000);
  const kilometrosVisita = numero(entrada.kilometrosVisita, 'Kilómetros por visita', 100_000);
  const valorKilometro = numero(entrada.valorKilometro, 'Valor por kilómetro', 1_000_000_000);
  const viaticosVisita = numero(entrada.viaticosVisita, 'Viáticos por visita', 1_000_000_000);
  const extrasMensuales = numero(entrada.extrasMensuales, 'Extras mensuales', 1_000_000_000);
  const descuentoPorcentaje = numero(entrada.descuento, 'Descuento', 100);
  const vigenciaDias = entero(entrada.vigenciaDias, 'Vigencia', 180, 15);
  if (vigenciaDias < 1) throw new Error('La vigencia debe ser de al menos 1 día.');

  const trabajo = horasVisita * valorHora;
  const mediciones = activos * valorActivo;
  const traslado = kilometrosVisita * valorKilometro;
  const porVisita = trabajo + mediciones + traslado + viaticosVisita;
  const subtotal = porVisita * visitasMes + extrasMensuales;
  const descuento = subtotal * descuentoPorcentaje / 100;

  return {
    concepto: texto(entrada.concepto, 160) ?? 'Plan Gestionado ActivaQR',
    planSoftware: planCrudo as CotizacionCalculada['planSoftware'],
    detalle: {
      activos,
      visitasMes,
      horasVisita,
      valorHora,
      valorActivo,
      kilometrosVisita,
      valorKilometro,
      viaticosVisita,
      extrasMensuales,
      descuentoPorcentaje,
      porVisita: redondear(porVisita),
      notas: texto(entrada.notas, 2_000),
    },
    subtotal: redondear(subtotal),
    descuento: redondear(descuento),
    total: redondear(Math.max(0, subtotal - descuento)),
    vigenciaDias,
  };
}

export function calcularCotizacionActivaControl(entrada: Record<string, unknown>): CotizacionActivaControlCalculada {
  const dispositivos = entero(entrada.dispositivos, 'Dispositivos', 10_000, 1);
  if (dispositivos < 1) throw new Error('La propuesta necesita al menos un dispositivo.');
  const costoReferenciaDispositivo = numero(entrada.costoReferenciaDispositivo, 'Costo de referencia del dispositivo', 1_000_000_000, 100_000);
  const precioInstaladoDispositivo = numero(entrada.precioInstaladoDispositivo, 'Precio instalado por dispositivo', 1_000_000_000, 200_000);
  const extrasImplementacion = numero(entrada.extrasImplementacion, 'Extras de implementación', 1_000_000_000);
  const abonoPorDispositivo = numero(entrada.abonoPorDispositivo, 'Abono por dispositivo', 1_000_000_000, 12_000);
  const abonoMinimoMensual = numero(entrada.abonoMinimoMensual, 'Abono mínimo mensual', 1_000_000_000, 35_000);
  const retencionDias = entero(entrada.retencionDias, 'Retención histórica', 3_650, 365);
  if (retencionDias < 7) throw new Error('La retención histórica debe ser de al menos 7 días.');
  const descuentoPorcentaje = numero(entrada.descuento, 'Descuento', 100);
  const vigenciaDias = entero(entrada.vigenciaDias, 'Vigencia', 180, 15);
  if (vigenciaDias < 1) throw new Error('La vigencia debe ser de al menos 1 día.');
  const cargoInicial = dispositivos * precioInstaladoDispositivo + extrasImplementacion;
  const descuento = cargoInicial * descuentoPorcentaje / 100;
  const abonoMensual = Math.max(dispositivos * abonoPorDispositivo, abonoMinimoMensual);
  return {
    concepto: texto(entrada.concepto, 160) ?? 'ActivaControl · monitoreo y operación inteligente',
    planSoftware: 'industrial',
    detalle: {
      dispositivos,
      costoReferenciaDispositivo,
      precioInstaladoDispositivo,
      extrasImplementacion,
      cargoInicial: redondear(cargoInicial),
      abonoPorDispositivo,
      abonoMinimoMensual,
      abonoMensual: redondear(abonoMensual),
      retencionDias,
      incluyeAlertas: entrada.incluyeAlertas !== false,
      incluyeControlRemoto: entrada.incluyeControlRemoto !== false,
      notas: texto(entrada.notas, 2_000),
    },
    subtotal: redondear(cargoInicial),
    descuento: redondear(descuento),
    total: redondear(Math.max(0, cargoInicial - descuento)),
    vigenciaDias,
  };
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function armarTextoCotizacion(params: {
  numero: string;
  clienteNombre: string;
  concepto: string;
  planSoftware: string;
  detalle: DetalleCotizacionGestionada;
  subtotal: number;
  descuento: number;
  total: number;
  vigenciaHasta: Date;
}): string {
  const descuento = params.descuento > 0
    ? `\nDescuento: -${ARS.format(params.descuento)}`
    : '';
  const notas = params.detalle.notas ? `\nObservaciones: ${params.detalle.notas}` : '';
  return [
    `COTIZACIÓN ${params.numero} — ACTIVAQR`,
    `Cliente: ${params.clienteNombre}`,
    `Concepto: ${params.concepto}`,
    `Plataforma: Plan ${params.planSoftware.toUpperCase()} (suscripción de software por separado)`,
    `Equipos relevados: ${params.detalle.activos}`,
    `Frecuencia: ${params.detalle.visitasMes} visita(s) por mes`,
    `Duración estimada: ${params.detalle.horasVisita} hora(s) por visita`,
    `Servicio por visita: ${ARS.format(params.detalle.porVisita)}`,
    `Subtotal mensual: ${ARS.format(params.subtotal)}${descuento}`,
    `TOTAL MENSUAL: ${ARS.format(params.total)}`,
    `Válida hasta: ${params.vigenciaHasta.toLocaleDateString('es-AR')}${notas}`,
    '',
    'Incluye toma de mediciones en campo, carga en ActivaQR, control de alertas e informe PDF.',
    'No incluye mantenimiento correctivo, repuestos, materiales ni mano de obra adicional.',
    'Si se detecta una anomalía, cualquier correctivo se cotiza por separado y sólo puede ejecutarse con aprobación expresa del administrador de la empresa y orden de trabajo autorizada.',
    'La suscripción de software se factura aparte según el plan elegido.',
  ].join('\n');
}

export function armarTextoCotizacionActivaControl(params: {
  numero: string;
  clienteNombre: string;
  concepto: string;
  detalle: DetalleCotizacionActivaControl;
  subtotal: number;
  descuento: number;
  total: number;
  vigenciaHasta: Date;
}): string {
  const descuento = params.descuento > 0 ? `\nDescuento sobre implementación: -${ARS.format(params.descuento)}` : '';
  const notas = params.detalle.notas ? `\nObservaciones: ${params.detalle.notas}` : '';
  return [
    `COTIZACIÓN ${params.numero} — ACTIVACONTROL`,
    `Cliente: ${params.clienteNombre}`,
    `Concepto: ${params.concepto}`,
    `Dispositivos provistos e instalados: ${params.detalle.dispositivos}`,
    `Precio instalado por dispositivo: ${ARS.format(params.detalle.precioInstaladoDispositivo)}`,
    `Inversión inicial: ${ARS.format(params.subtotal)}${descuento}`,
    `TOTAL PUESTA EN MARCHA: ${ARS.format(params.total)}`,
    `ABONO MENSUAL: ${ARS.format(params.detalle.abonoMensual)}`,
    `Válida hasta: ${params.vigenciaHasta.toLocaleDateString('es-AR')}${notas}`,
    '',
    `Incluye provisión, instalación y configuración de ${params.detalle.dispositivos} dispositivo(s), tablero ActivaControl personalizado, historial por ${params.detalle.retencionDias} días y soporte remoto.`,
    params.detalle.incluyeAlertas ? 'Incluye reglas de alarma y notificaciones al celular.' : 'No incluye reglas ni notificaciones de alarma.',
    params.detalle.incluyeControlRemoto ? 'Incluye operación remota auditada en dispositivos compatibles, sujeta a protecciones e interbloqueos locales.' : 'La propuesta es sólo de monitoreo; no habilita operación remota.',
    'El abono contempla plataforma, almacenamiento, sincronización y mantenimiento evolutivo. Trabajos eléctricos adicionales, conectividad del sitio y repuestos se cotizan por separado.',
  ].join('\n');
}
