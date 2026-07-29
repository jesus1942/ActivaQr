import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '../prisma';
import { obtenerPreapproval, obtenerPago } from '../mercadopago';
import { cambiosEmpresaPorSuscripcion } from '../suscripcionState';
import type { PlanId } from '../planCatalog';

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

    const tipoStr = String(tipo);

    // ── Evento de pago individual ──────────────────────────────
    if (tipoStr === 'payment') {
      const pago = await obtenerPago(String(id));
      const empresaId = pago.external_reference;
      if (!empresaId) return;

      // Evitar duplicados por ID de pago MP
      const existe = await prisma.pagoMP.findUnique({ where: { mpPagoId: String(pago.id) } });
      if (!existe) {
        await prisma.pagoMP.create({
          data: {
            empresaId,
            mpPagoId: String(pago.id),
            monto: pago.transaction_amount,
            moneda: pago.currency_id ?? 'ARS',
            estado: pago.status,
            concepto: pago.description ?? null,
            fecha: pago.date_approved ? new Date(pago.date_approved) : new Date(),
            preapprovalId: pago.preapproval_id ?? null,
          },
        });
        console.log(`MP pago registrado: ${pago.id} empresa=${empresaId} monto=${pago.transaction_amount} estado=${pago.status}`);
      }
      return;
    }

    // ── Evento de suscripción (preapproval) ───────────────────
    const esPreapproval = tipoStr.includes('preapproval') || tipoStr.includes('subscription');
    if (!esPreapproval) return;

    const info = await obtenerPreapproval(String(id));
    const empresaId = info.external_reference;
    if (!empresaId) return;

    const monto = info.auto_recurring?.transaction_amount;
    const empresaActual = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { planSolicitado: true },
    });

    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...cambiosEmpresaPorSuscripcion(
          info.status,
          empresaActual?.planSolicitado as PlanId | null | undefined
        ),
        mpPreapprovalId: info.id,
        mpEstadoSub: info.status,
        mpMonto: monto ?? undefined,
        ...(info.status === 'authorized' ? { mpUltimoPago: new Date() } : {}),
      },
    });

    // Registrar el cobro de la suscripción si viene autorizado
    if (info.status === 'authorized' && monto) {
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      const yaRegistrado = await prisma.pagoMP.findFirst({
        where: { empresaId, preapprovalId: info.id, fecha: { gte: inicioMes, lt: finMes } },
      });
      if (!yaRegistrado) {
        await prisma.pagoMP.create({
          data: {
            empresaId,
            monto,
            moneda: 'ARS',
            estado: 'approved',
            concepto: 'Suscripción mensual ActivaQR',
            preapprovalId: info.id,
          },
        });
      }
    }

    console.log(`MP webhook: empresa ${empresaId} procesada (${info.status})`);
  } catch (err) {
    console.error('Error procesando webhook de Mercado Pago:', err);
  }
});

export default router;
