/**
 * Límites por plan de suscripción.
 * null = ilimitado.
 */
import { PLANES } from './planCatalog';

export const LIMITES_PLAN: Record<string, { activos: number | null; usuarios: number | null }> =
  Object.fromEntries(Object.entries(PLANES).map(([id, plan]) => [
    id,
    { activos: plan.activosMaximos, usuarios: plan.usuariosMaximos },
  ]));

export function getLimite(plan: string) {
  return LIMITES_PLAN[plan] ?? LIMITES_PLAN['inicial'];
}
