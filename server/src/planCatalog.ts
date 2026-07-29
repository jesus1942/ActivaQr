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

const PRECIO_ENV: Record<PlanId, string> = {
  inicial: 'ACTIVAQR_PRECIO_INICIAL_ARS',
  empresa: 'ACTIVAQR_PRECIO_EMPRESA_ARS',
  industrial: 'ACTIVAQR_PRECIO_INDUSTRIAL_ARS',
};

export function esPlanId(value: string): value is PlanId {
  return Object.prototype.hasOwnProperty.call(PLANES, value);
}

export function precioBaseArs(plan: PlanId): number | null {
  const value = Number(process.env[PRECIO_ENV[plan]]);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
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
