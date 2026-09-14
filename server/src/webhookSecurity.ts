import { createHmac, timingSafeEqual } from 'crypto';
import type { RequestHandler } from 'express';

/** Compara secretos sin filtrar diferencias de contenido en el tiempo de comparación. */
function iguales(a: string, b: string): boolean {
  const izquierda = Buffer.from(a);
  const derecha = Buffer.from(b);
  return izquierda.length === derecha.length && timingSafeEqual(izquierda, derecha);
}

/** Rechaza el webhook sin afectar el arranque ni las demás rutas de la API. */
export const requireTelegramWebhookSecret: RequestHandler = (req, res, next) => {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    res.status(503).json({ error: 'Webhook no configurado' });
    return;
  }
  const recibido = req.headers['x-telegram-bot-api-secret-token'];
  if (typeof recibido !== 'string' || !iguales(recibido, secret)) {
    res.status(401).json({ error: 'Webhook no autorizado' });
    return;
  }
  next();
};

/** Valida la firma de MP y fija el ID consultable al mismo ID autenticado de la URL. */
export const requireMercadoPagoSignature: RequestHandler = (req, res, next) => {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret?.trim()) {
    res.status(503).json({ error: 'Webhook no configurado' });
    return;
  }
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'];
  const rechazar = () => { res.status(401).json({ error: 'Webhook no autorizado' }); };
  // Nunca usar body.data.id ni el parámetro IPN id: no pertenecen al manifiesto firmado.
  if (typeof signature !== 'string' || typeof requestId !== 'string' ||
      !requestId || /[;\r\n]/.test(requestId) || typeof dataId !== 'string' ||
      !/^[A-Za-z0-9_-]+$/.test(dataId)) {
    rechazar();
    return;
  }
  const campos = new Map<string, string>();
  for (const parte of signature.split(',')) {
    const match = /^\s*([A-Za-z0-9_-]+)\s*=\s*([^\s,=]+)\s*$/.exec(parte);
    if (!match || campos.has(match[1])) { rechazar(); return; }
    campos.set(match[1], match[2]);
  }
  const ts = campos.get('ts');
  const firma = campos.get('v1');
  if (!ts || !/^\d+$/.test(ts) || !firma || !/^[a-fA-F0-9]{64}$/.test(firma)) {
    rechazar();
    return;
  }
  // MP exige minúsculas para IDs alfanuméricos. No se impone caducidad arbitraria:
  // los reintentos legítimos se reconcilian consultando el estado actual en su API.
  const id = dataId.toLowerCase();
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  if (!iguales(firma.toLowerCase(), expected)) { rechazar(); return; }
  res.locals.mercadoPagoDataId = id;
  next();
};
