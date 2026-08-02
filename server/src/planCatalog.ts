export type PlanId = 'inicial' | 'empresa' | 'industrial';

export const PLANES = {
  inicial: {
    nombre: 'Inicial',
    precioReferenciaUsd: 29,
    activosIncluidos: 50,
    activosMaximos: 50,
    usuariosMaximos: 3,
    recargoPorBloqueUsd: null,
    tamanoBloqueExtra: null,
  },
  empresa: {
    nombre: 'Empresa',
    precioReferenciaUsd: 59,
    activosIncluidos: 200,
    activosMaximos: 200,
    usuariosMaximos: 10,
    recargoPorBloqueUsd: null,
    tamanoBloqueExtra: null,
  },
  industrial: {
    nombre: 'Industrial',
    precioReferenciaUsd: 100,
    activosIncluidos: 500,
    activosMaximos: null,
    usuariosMaximos: null,
    recargoPorBloqueUsd: 20,
    tamanoBloqueExtra: 100,
  },
} as const;

export const PLAN_IDS = Object.keys(PLANES) as PlanId[];

export function esPlanId(value: string): value is PlanId {
  return Object.prototype.hasOwnProperty.call(PLANES, value);
}

export function bloquesExtra(plan: PlanId, cantidadActivos: number): number {
  const config = PLANES[plan];
  if (!config.tamanoBloqueExtra || cantidadActivos <= config.activosIncluidos) return 0;
  return Math.ceil((cantidadActivos - config.activosIncluidos) / config.tamanoBloqueExtra);
}

export function multiplicadorPrecio(plan: PlanId, cantidadActivos: number): number {
  const config = PLANES[plan];
  if (!config.recargoPorBloqueUsd) return 1;
  return 1 + bloquesExtra(plan, cantidadActivos) *
    (config.recargoPorBloqueUsd / config.precioReferenciaUsd);
}

export function precioReferenciaUsd(plan: PlanId, cantidadActivos: number): number {
  const config = PLANES[plan];
  return config.precioReferenciaUsd +
    bloquesExtra(plan, cantidadActivos) * (config.recargoPorBloqueUsd ?? 0);
}

/**
 * Convierte el precio canónico en USD al monto que Mercado Pago recibirá en
 * pesos. El redondeo hacia arriba evita diferencias de centavos y mantiene
 * importes legibles sin alterar la referencia comercial en dólares.
 */
export function precioArsDesdeCotizacion(
  plan: PlanId,
  cantidadActivos: number,
  usdArs: number,
  redondeoArs = 100,
): number {
  if (!Number.isFinite(usdArs) || usdArs <= 0) {
    throw new Error('La cotización USD/ARS no es válida.');
  }
  if (!Number.isInteger(redondeoArs) || redondeoArs <= 0) {
    throw new Error('El redondeo en ARS no es válido.');
  }
  const importe = precioReferenciaUsd(plan, cantidadActivos) * usdArs;
  return Math.ceil(importe / redondeoArs) * redondeoArs;
}
