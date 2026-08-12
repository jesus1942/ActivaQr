/* Manejador de notificaciones push para ActivaQR.
   Importado por el service worker generado (Workbox) vía importScripts. */

// El SW vive en la raíz del deploy, así que su propia URL determina la base
// ('/' con dominio propio, '/ActivaQr/' en GitHub Pages sin dominio).
const BASE = new URL('./', self.location.href).pathname;

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ActivaQR', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'ActivaQR';
  const options = {
    body: data.body || '',
    icon: BASE + 'icons/icon-192.png',
    badge: BASE + 'icons/icon-96.png',
    tag: data.tag || 'activaqr-aviso',
    renotify: Boolean(data.tag),
    requireInteraction: data.severity === 'critical',
    vibrate: data.severity === 'critical' ? [250, 120, 250, 120, 400] : [180],
    data: { url: data.url || '#/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || '#/';
  const target = BASE + (rawUrl.startsWith('#') ? rawUrl : '#/' + rawUrl.replace(/^#?\/?/, ''));
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.indexOf(BASE) !== -1 && 'focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
