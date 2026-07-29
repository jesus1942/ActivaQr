/**
 * Lógica de fases del free trial autogestionado.
 *
 *  activo   → acceso completo (con tope de 50 activos del plan inicial)
 *  lectura  → solo lectura: puede ver y escanear QR, no puede escribir
 *  vencido  → bloqueo total, debe pagar
 *  null     → la empresa no es trial (cliente pago)
 */
export type FaseTrial = 'activo' | 'lectura' | 'vencido' | null;

export interface EmpresaTrial {
  esTrial: boolean;
  trialFin: Date | null;
  trialLecturaFin: Date | null;
}

export function faseTrial(empresa: EmpresaTrial, ahora: Date = new Date()): FaseTrial {
  if (!empresa.esTrial) return null;
  if (empresa.trialFin && ahora < empresa.trialFin) return 'activo';
  if (empresa.trialLecturaFin && ahora < empresa.trialLecturaFin) return 'lectura';
  return 'vencido';
}
