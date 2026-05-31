/**
 * Cliente mínimo de Mercado Pago Suscripciones (preapproval).
 * Usa fetch directo contra la API REST para no sumar dependencias.
 * Requiere la variable de entorno MP_ACCESS_TOKEN.
 */

const MP_API = 'https://api.mercadopago.com';

export function mpConfigurado(): boolean {
  return !!process.env.MP_ACCESS_TOKEN;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export interface PreapprovalCreado {
  id: string;
  init_point: string;
  status: string;
}

/**
 * Crea una suscripción (preapproval) con débito automático mensual.
 * Devuelve el init_point: el link que la empresa abre para adherirse.
 */
export async function crearPreapproval(params: {
  empresaId: string;
  monto: number;
  razon: string;
  backUrl: string;
}): Promise<PreapprovalCreado> {
  const res = await fetch(`${MP_API}/preapproval`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      reason: params.razon,
      external_reference: params.empresaId,
      back_url: params.backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: params.monto,
        currency_id: 'ARS',
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo crear la suscripción en Mercado Pago.');
  }
  return { id: data.id, init_point: data.init_point, status: data.status };
}

export interface PreapprovalInfo {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string;
  payer_email?: string;
  auto_recurring?: { transaction_amount?: number };
}

/** Consulta el estado actual de una suscripción por su id. */
export async function obtenerPreapproval(id: string): Promise<PreapprovalInfo> {
  const res = await fetch(`${MP_API}/preapproval/${id}`, { headers: headers() });
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo consultar la suscripción en Mercado Pago.');
  }
  return data as PreapprovalInfo;
}
