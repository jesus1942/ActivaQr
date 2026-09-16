/**
 * Registro y diagnóstico de notificaciones Web Push / VAPID.
 * Un permiso "granted" no alcanza: el dispositivo debe tener una suscripción
 * del service worker y esa suscripción debe existir también en el backend.
 */
import { apiFetch } from './auth';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer;
}

export type EstadoPush = {
  soportado: boolean;
  permiso: NotificationPermission | 'unsupported';
  suscriptoNavegador: boolean;
  suscriptoServidor: boolean;
  servidorConfigurado: boolean;
  listo: boolean;
  error?: string;
};

export function estadoNotificaciones(): NotificationPermission | 'unsupported' {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function verificarNotificaciones(): Promise<EstadoPush> {
  const permiso = estadoNotificaciones();
  if (permiso === 'unsupported') {
    return { soportado: false, permiso, suscriptoNavegador: false, suscriptoServidor: false, servidorConfigurado: false, listo: false };
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    const endpoint = sub?.endpoint || '';
    const res = await apiFetch(`push/status${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ''}`);
    const data = await res.json().catch(() => ({}));
    const servidorConfigurado = Boolean(data?.configurado);
    const suscriptoServidor = Boolean(data?.suscripto);
    const suscriptoNavegador = Boolean(sub);
    return {
      soportado: true,
      permiso,
      suscriptoNavegador,
      suscriptoServidor,
      servidorConfigurado,
      listo: permiso === 'granted' && suscriptoNavegador && suscriptoServidor && servidorConfigurado,
    };
  } catch (error) {
    return {
      soportado: true,
      permiso,
      suscriptoNavegador: false,
      suscriptoServidor: false,
      servidorConfigurado: false,
      listo: false,
      error: error instanceof Error ? error.message : 'No se pudo verificar Web Push.',
    };
  }
}

export async function activarNotificaciones(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await apiFetch('push/public-key');
    const keyData = await keyResponse.json();
    const key = keyData?.key ?? null;
    if (!key) return false;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }

    const res = await apiFetch('push/subscribe', { method: 'POST', body: JSON.stringify(sub) });
    if (!res.ok) return false;
    const estado = await verificarNotificaciones();
    return estado.listo;
  } catch (e) {
    console.error('[push] error al suscribir:', e);
    return false;
  }
}

export async function probarNotificaciones(): Promise<boolean> {
  try {
    const estado = await verificarNotificaciones();
    if (!estado.listo) return false;
    const res = await apiFetch('push/test', { method: 'POST' });
    return res.ok;
  } catch (e) {
    console.error('[push] error en prueba:', e);
    return false;
  }
}

export async function desactivarNotificaciones(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return true;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await apiFetch('push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) });
    return true;
  } catch (e) {
    console.error('[push] error al desuscribir:', e);
    return false;
  }
}
