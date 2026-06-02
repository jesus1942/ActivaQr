import Stripe from 'stripe';

export function stripeConfigurado(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function client() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function crearStripeSubscripcion(params: {
  empresaId: string;
  monto: number;
  moneda: 'usd' | 'uyu';
  razon: string;
  backUrl: string;
}): Promise<{ sessionUrl: string; sessionId: string }> {
  const session = await client().checkout.sessions.create({
    mode: 'subscription',
    metadata: { empresaId: params.empresaId },
    line_items: [{
      price_data: {
        currency: params.moneda,
        product_data: { name: params.razon },
        unit_amount: Math.round(params.monto * 100),
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    success_url: params.backUrl,
    cancel_url: params.backUrl,
  });
  return { sessionUrl: session.url!, sessionId: session.id };
}

export async function crearStripePagoUnico(params: {
  empresaId: string;
  monto: number;
  moneda: 'usd' | 'uyu';
  descripcion: string;
  backUrl: string;
}): Promise<{ sessionUrl: string; sessionId: string }> {
  const session = await client().checkout.sessions.create({
    mode: 'payment',
    metadata: { empresaId: params.empresaId },
    line_items: [{
      price_data: {
        currency: params.moneda,
        product_data: { name: params.descripcion },
        unit_amount: Math.round(params.monto * 100),
      },
      quantity: 1,
    }],
    success_url: params.backUrl,
    cancel_url: params.backUrl,
  });
  return { sessionUrl: session.url!, sessionId: session.id };
}
