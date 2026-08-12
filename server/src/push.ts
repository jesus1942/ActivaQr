/**
 * Notificaciones push (Web Push / VAPID).
 * Si las claves VAPID no están configuradas, las funciones no hacen nada
 * (no-op) y registran un aviso. Ningún fallo de push rompe el request principal.
 */
import webpush from 'web-push';
import { prisma } from './prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:avisos@activaqr.net';

let configurado = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configurado = true;
  } catch (e) {
    console.error('[push] error configurando VAPID:', e);
  }
} else {
  console.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas — notificaciones push deshabilitadas.');
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  severity?: 'info' | 'warning' | 'critical';
  tag?: string;
}

/** Envía una notificación a todas las suscripciones de un usuario. */
export async function enviarPushAUsuario(usuarioId: string, payload: PushPayload): Promise<void> {
  if (!configurado) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { usuarioId } });
    const data = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            data,
            { TTL: payload.severity === 'critical' ? 24 * 60 * 60 : 60 * 60, urgency: payload.severity === 'critical' ? 'high' : 'normal' },
          );
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error('[push] error enviando a suscripción:', status, err?.body || err?.message);
          }
        }
      }),
    );
  } catch (e) {
    console.error('[push] enviarPushAUsuario falló:', e);
  }
}

/** Envía a todos los usuarios de una empresa, opcionalmente filtrando por rol. */
export async function enviarPushAEmpresa(empresaId: string, payload: PushPayload, roles?: string[]): Promise<void> {
  if (!configurado) return;
  try {
    const where: any = { empresaId };
    if (roles && roles.length) where.rol = { in: roles };
    const usuarios = await prisma.usuario.findMany({ where, select: { id: true } });
    await Promise.all(usuarios.map((u) => enviarPushAUsuario(u.id, payload)));
  } catch (e) {
    console.error('[push] enviarPushAEmpresa falló:', e);
  }
}

/** Envía a todos los superadmin. */
export async function enviarPushASuperadmin(payload: PushPayload): Promise<void> {
  if (!configurado) return;
  try {
    const usuarios = await prisma.usuario.findMany({ where: { rol: 'superadmin' }, select: { id: true } });
    await Promise.all(usuarios.map((u) => enviarPushAUsuario(u.id, payload)));
  } catch (e) {
    console.error('[push] enviarPushASuperadmin falló:', e);
  }
}
