# ActivaQR Cámaras

Módulo multi-tenant de video y eventos integrado con ActivaQR Control. La primera versión productiva deja preparado el inventario, la ingesta y la interfaz sin requerir acceso inmediato al NVR.

## Funciones disponibles

- Mosaico responsive de cámaras por empresa.
- Vista en vivo mediante una URL HTTPS entregada por un gateway seguro.
- Eventos de movimiento, persona, vehículo, animal, cruce de línea, manipulación y desconexión.
- Gráfico de actividad por hora durante las últimas 24 horas.
- Ingesta idempotente de eventos genéricos o Frigate.
- Notificaciones push para persona, manipulación y desconexión.
- Inventario y conectores ONVIF, Frigate, Hikvision, Dahua, Reolink, Tuya y genérico.

## Aislamiento por tenant

`IntegracionCamara`, `Camara` y `EventoCamara` conservan `empresaId`. Todas las rutas autenticadas lo obtienen de la sesión y filtran consultas y mutaciones con esa identidad. El endpoint máquina a máquina resuelve la empresa desde el hash del token único de la integración.

Un tenant no puede elegir otro `empresaId` ni asociar una cámara a un conector ajeno. Escuela Nueva Austral ve exclusivamente sus cámaras y eventos.

## Seguridad del video

- ActivaQR no acepta URLs RTSP en el navegador.
- Una URL de reproducción debe ser HTTPS y no puede incluir usuario ni contraseña.
- Las credenciales ONVIF, RTSP o del fabricante se conservarán cifradas del lado servidor/gateway.
- No se deben publicar puertos del NVR o de las cámaras directamente en Internet.
- El gateway local inicia la salida segura hacia ActivaQR.
- Se rechazan `localhost`, dominios `.local`, `.lan` o `.internal`, IP privadas, link-local, loopback, multicast e IPv6 literal en URLs de reproducción.
- La ingesta pasa por el limitador de requests y exige un token aleatorio de 256 bits almacenado como hash.

## Revisión de dependencias

La auditoría productiva del servidor quedó sin vulnerabilidades conocidas después de actualizar `express-rate-limit` e `ip-address`. En el frontend se actualizó DOMPurify. Quedan dos avisos moderados de React Router 6 sin parche disponible en esa rama: el riesgo de hidratación SSR no aplica porque ActivaQR es una SPA Vite sin SSR, y la navegación sólo usa rutas internas construidas por la aplicación, sin destinos externos controlados por usuarios. La migración a React Router 7 se evaluará de manera separada para evitar una actualización mayor dentro del despliegue de cámaras.

## Endpoint de eventos

El administrador crea un conector y genera un endpoint de un solo uso visible. ActivaQR almacena únicamente el hash del token. El formato genérico es:

```json
{
  "eventId": "mov-0001",
  "cameraId": "entrada-principal",
  "cameraName": "Entrada principal",
  "type": "person",
  "zone": "puerta",
  "confidence": 0.91,
  "startedAt": "2026-08-12T20:30:00.000Z"
}
```

También se normaliza el objeto `after` publicado por Frigate, incluyendo `id`, `camera`, `label`, `start_time`, `score` y `current_zones`.

## Activación del vivo real

Todavía no se declara ninguna cámara como conectada si no existe acceso al equipo. Para activar el vivo se necesita una de estas opciones:

1. Acceso ONVIF/RTSP al NVR o a las cámaras IP desde la red local.
2. API o nube del fabricante autorizada por el tenant.
3. Gateway Frigate/go2rtc o equivalente instalado en la escuela.

El gateway convierte el video a HLS/WebRTC sobre HTTPS. La interfaz distingue una cámara inventariada de una transmisión efectivamente disponible.
