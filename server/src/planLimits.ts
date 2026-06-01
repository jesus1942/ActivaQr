/**
 * Límites por plan de suscripción.
 * null = ilimitado.
 */
export const LIMITES_PLAN: Record<string, { activos: number | null; usuarios: number | null }> = {
  inicial:    { activos: 10,   usuarios: 2  },
  empresa:    { activos: 50,   usuarios: 5  },
  industrial: { activos: null, usuarios: null },
};

export function getLimite(plan: string) {
  return LIMITES_PLAN[plan] ?? LIMITES_PLAN['inicial'];
}
