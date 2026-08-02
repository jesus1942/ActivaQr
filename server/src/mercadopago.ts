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
  payerEmail: string;
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
      payer_email: params.payerEmail,
      back_url: params.backUrl,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Math.round(params.monto),
        currency_id: 'ARS',
      },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    console.error('[MP crearPreapproval] error:', JSON.stringify(data));
    throw new Error(data?.message || data?.cause?.[0]?.description || 'No se pudo crear la suscripción en Mercado Pago.');
  }
  return { id: data.id, init_point: data.init_point, status: data.status };
}

export interface PreapprovalInfo {
  id: string;
  init_point?: string;
  status: string; // pending | authorized | paused | cancelled
  external_reference?: string;
  payer_email?: string;
  auto_recurring?: { transaction_amount?: number | string };
}

export async function actualizarMontoPreapproval(id: string, monto: number, razon: string): Promise<void> {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      reason: razon,
      auto_recurring: { transaction_amount: Math.round(monto), currency_id: 'ARS' },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || 'No se pudo actualizar el importe de la suscripción.');
  }
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

export interface PagoInfo {
  id: string;
  status: string; // approved | pending | rejected | cancelled
  transaction_amount: number;
  currency_id: string;
  description?: string;
  date_approved?: string;
  date_created?: string;
  external_reference?: string;
  preapproval_id?: string;
}

/** Consulta un pago individual por su ID. */
export async function obtenerPago(id: string): Promise<PagoInfo> {
  const res = await fetch(`${MP_API}/v1/payments/${id}`, { headers: headers() });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(data?.message || 'No se pudo consultar el pago.');
  return data as PagoInfo;
}

/** Cancela una suscripción activa en Mercado Pago. */
export async function cancelarPreapproval(id: string): Promise<void> {
  const res = await fetch(`${MP_API}/preapproval/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const data = body.message || 'No se pudo cancelar la suscripción en Mercado Pago.';
    throw new Error(data);
  }
}

/**
 * Crea un link de pago único (preference) que acepta cualquier medio:
 * tarjeta, Prex, transferencia, billeteras, etc.
 * No requiere que el pagador tenga cuenta MP.
 */
export async function crearLinkPago(params: {
  empresaId: string;
  monto: number;
  descripcion: string;
  backUrl: string;
  payerEmail?: string;
}): Promise<{ id: string; init_point: string }> {
  const body: any = {
    external_reference: params.empresaId,
    items: [{
      title: params.descripcion,
      quantity: 1,
      unit_price: Math.round(params.monto),
      currency_id: 'ARS',
    }],
    back_urls: {
      success: params.backUrl,
      failure: params.backUrl,
      pending: params.backUrl,
    },
    auto_return: 'approved',
  };
  if (params.payerEmail) body.payer = { email: params.payerEmail };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  if (!res.ok) {
    console.error('[MP crearLinkPago] error:', JSON.stringify(data));
    throw new Error(data?.message || 'No se pudo generar el link de pago.');
  }
  return { id: data.id, init_point: data.init_point };
}
