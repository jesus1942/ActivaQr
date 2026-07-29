// Feature matrix por plan. Cada plan habilita un subset de features.
// El plan Inicial es lo minimo (pyme de servicios), Empresa agrega
// colaboracion (acceso remoto, auditoria), Industrial agrega lo
// pesado (KPIs ejecutivos, mantenimiento predictivo, IoT).
//
// Uso:
//   import { hasFeature } from '../data/planes';
//   if (hasFeature(usuario?.empresa?.plan, 'kpisEjecutivos')) { ... }
//
// La idea es que un componente o ruta "premium" use este helper para
// esconderse o mostrar un placeholder con CTA de upgrade.

export type Plan = 'inicial' | 'empresa' | 'industrial';

export const LIMITE_ACTIVOS_POR_PLAN: Record<Plan, number | null> = {
  inicial: 50,
  empresa: 200,
  industrial: null,
};

export type Feature =
  | 'indicadores'        // KPIs basicos (disponibilidad, cumplimiento)
  | 'kpisEjecutivos'     // MTTR/MTBF y tendencias avanzadas
  | 'accesoRemoto'       // Chat tecnico remoto con cliente
  | 'auditoria'          // Trazabilidad de quien hizo que
  | 'predictivo'         // Modulo de mantenimiento predictivo
  | 'catalogoFallas'     // Catalogo de codigos de error y soluciones
  | 'iot'                // Endpoints para sensores
  | 'gpsTracking';       // Tracking de activos moviles (v2)

const FEATURES_POR_PLAN: Record<Plan, ReadonlySet<Feature>> = {
  inicial: new Set<Feature>([
    // Solo las basicas. Activos, mediciones, mantenimiento, reportes,
    // documentos y QR estan disponibles SIEMPRE (no son features
    // opcionales aca).
  ]),
  empresa: new Set<Feature>([
    'indicadores',
    'accesoRemoto',
    'auditoria',
  ]),
  industrial: new Set<Feature>([
    'indicadores',
    'kpisEjecutivos',
    'accesoRemoto',
    'auditoria',
    'predictivo',
    'catalogoFallas',
    'iot',
    'gpsTracking',
  ]),
};

const PLAN_REQUERIDO: Record<Feature, Plan> = {
  indicadores: 'empresa',
  kpisEjecutivos: 'industrial',
  accesoRemoto: 'empresa',
  auditoria: 'empresa',
  predictivo: 'industrial',
  catalogoFallas: 'industrial',
  iot: 'industrial',
  gpsTracking: 'industrial',
};

const PLAN_LABEL: Record<Plan, string> = {
  inicial: 'Inicial',
  empresa: 'Empresa',
  industrial: 'Industrial',
};

function normalizarPlan(plan: string | null | undefined): Plan {
  if (plan === 'empresa' || plan === 'industrial' || plan === 'inicial') return plan;
  return 'inicial';
}

export function hasFeature(plan: string | null | undefined, feature: Feature): boolean {
  return FEATURES_POR_PLAN[normalizarPlan(plan)].has(feature);
}

export function planRequerido(feature: Feature): Plan {
  return PLAN_REQUERIDO[feature];
}

export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABEL[normalizarPlan(plan)];
}
