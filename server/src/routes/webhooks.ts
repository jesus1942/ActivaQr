import { Router, Request, Response } from 'express';
import { requireMercadoPagoSignature } from '../webhookSecurity';
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
 * La firma se exige antes del ACK; la falta de configuración responde 503.
 */
router.post('/mercadopago', requireMercadoPagoSignature, async (req: Request, res: Response) => {
  res.sendStatus(200); // responder rápido; procesamos después

  try {
    const tipo = req.query.type || req.query.topic || req.body?.type;
    const id: string = res.locals.mercadoPagoDataId;

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

    const montoRaw = Number(info.auto_recurring?.transaction_amount);
    const monto = Number.isFinite(montoRaw) && montoRaw > 0 ? montoRaw : undefined;
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
