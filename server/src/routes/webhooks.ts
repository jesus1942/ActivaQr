import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../prisma';
import { obtenerPreapproval } from '../mercadopago';

const router = Router();

/**
 * Webhook de Mercado Pago.
 * MP avisa cada vez que cambia una suscripción o se procesa un pago.
 * Mapeamos el estado de MP al estado de la empresa:
 *   authorized           → activa
 *   paused / cancelled   → suspendida
 *
 * La ruta NO requiere auth (la llama MP), pero solo actúa sobre datos
 * que provienen de la propia API de MP consultada con nuestro token.
 * Siempre respondemos 200 para que MP no reintente en loop.
 */
router.post('/mercadopago', async (req: Request, res: Response) => {
  res.sendStatus(200); // responder rápido; procesamos después

  try {
    // Verificar firma HMAC de Mercado Pago si el secret está configurado.
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers['x-signature'] as string | undefined;
      const xRequestId = req.headers['x-request-id'] as string | undefined;
      const dataId = (req.query['data.id'] as string) || req.body?.data?.id;
      if (!xSignature || !xRequestId) return;
      // Formato esperado: "ts=<timestamp>,v1=<hash>"
      const parts = Object.fromEntries(xSignature.split(',').map((p) => p.split('=')));
      const ts = parts['ts'];
      const v1 = parts['v1'];
      if (!ts || !v1) return;
      const manifest = `id:${dataId ?? ''};request-id:${xRequestId};ts:${ts};`;
      const expected = createHmac('sha256', webhookSecret).update(manifest).digest('hex');
      try {
        if (!timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) return;
      } catch {
        return; // buffers de distinto largo — firma inválida
      }
    }

    const tipo = req.query.type || req.query.topic || req.body?.type;
    const id =
      (req.query['data.id'] as string) ||
      req.body?.data?.id ||
      (req.query.id as string);

    if (!id) return;

    // Solo nos interesan los eventos de suscripción (preapproval).
    const esPreapproval = String(tipo).includes('preapproval') || String(tipo).includes('subscription');
    if (!esPreapproval) return;

    const info = await obtenerPreapproval(String(id));
    const empresaId = info.external_reference;
    if (!empresaId) return;

    const nuevoEstado = info.status === 'authorized' ? 'activa' : 'suspendida';

    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        estado: nuevoEstado,
        mpPreapprovalId: info.id,
        mpEstadoSub: info.status,
        mpMonto: info.auto_recurring?.transaction_amount ?? undefined,
        ...(info.status === 'authorized' ? { mpUltimoPago: new Date() } : {}),
      },
    });

    console.log(`MP webhook: empresa ${empresaId} → ${nuevoEstado} (${info.status})`);
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago:', err);
  }
});

export default router;
