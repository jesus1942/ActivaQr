import type { PlanId } from './planCatalog';

export function cambiosEmpresaPorSuscripcion(status: string, planSolicitado?: PlanId | null) {
  if (status === 'authorized') {
    return {
      estado: 'activa' as const,
      esTrial: false,
      trialFin: null,
      trialLecturaFin: null,
      ...(planSolicitado ? { plan: planSolicitado, planSolicitado: null } : {}),
    };
  }
  if (status === 'paused' || status === 'cancelled') {
    return { estado: 'suspendida' as const };
  }
  return {};
}
