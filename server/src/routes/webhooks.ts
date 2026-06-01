import { Router, Request, Response } from 'express';
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
