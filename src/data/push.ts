/**
 * Registro de notificaciones push en el navegador (Web Push / VAPID).
 * La clave pública VAPID se obtiene del backend (no se hardcodea).
 */
import { apiFetch } from './auth';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function estadoNotificaciones(): NotificationPermission | 'unsupported' {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function activarNotificaciones(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;

  let key: string | null = null;
  try {
    const res = await apiFetch('push/public-key');
    const data = await res.json();
    key = data?.key ?? null;
  } catch {
    return false;
  }
  if (!key) return false;

  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const res = await apiFetch('push/subscribe', {
      method: 'POST',
      body: JSON.stringify(sub),
    });
    return res.ok;
  } catch (e) {
    console.error('[push] error al suscribir:', e);
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
    await apiFetch('push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch (e) {
    console.error('[push] error al desuscribir:', e);
    return false;
  }
}
