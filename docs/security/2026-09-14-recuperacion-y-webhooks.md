# Corrección de seguridad: sesiones, recuperación y webhooks

## Cambios de cuenta

- Los JWT se vinculan mediante HMAC al hash vigente de la contraseña. Cambiarla o restablecerla invalida las sesiones anteriores, incluido un reset administrativo. La huella no expone el hash de contraseña.
- Las sesiones emitidas antes de esta versión se rechazan: cada usuario tendrá que iniciar sesión nuevamente una vez después del despliegue.
- El restablecimiento consume el enlace y cambia la contraseña en una única escritura condicional, evitando que dos solicitudes reutilicen el mismo enlace.
- Vincular o cambiar Telegram exige contraseña actual y un código enviado al nuevo chat privado. El código vence a los diez minutos, admite cinco intentos persistentes y se consume una sola vez. Se limita también la frecuencia por cuenta.
- Desvincular exige contraseña; cambiar solamente el consentimiento de alertas no la exige.
- Cambiar el canal invalida enlaces de recuperación anteriores. La emisión de enlaces comprueba que la contraseña y el canal no hayan cambiado durante la solicitud.
- La pantalla interpreta las respuestas HTTP antes de anunciar que un cambio fue guardado.

## Despliegue

La rama de producción es `main`. GitHub Pages se publica mediante `.github/workflows/deploy.yml`; Railway compila el backend y ejecuta `start:railway`, que aplica las migraciones antes de iniciar Express.

La migración `20260914190000_secure_telegram_link` agrega cuatro campos de desafíos temporales a `Usuario`. No elimina registros ni altera los canales confirmados. Es compatible con la versión anterior, aunque volver al backend anterior volvería a habilitar los problemas de seguridad.

Para los webhooks deben existir los secretos indicados en `server/.env.example` y estar configurados también en cada proveedor. La ausencia de un secreto bloquea ese webhook; no detiene el resto de la API. Consultar `server/README.md` para el registro del webhook de Telegram y la configuración de Mercado Pago. No guardar secretos en Git.

## Validación

Las pruebas HTTP de `server/src/accountSecurity.test.ts` usan almacenamiento en memoria y Telegram simulado: no envían mensajes reales ni modifican cuentas de producción. Cubren revocación de sesiones, JWT anteriores, consumo concurrente del enlace, cambios de canal sin contraseña, códigos vencidos o reutilizados, agotamiento concurrente de intentos, fallos de envío y emisión de recuperación mientras cambia el canal.

Antes de publicar: `npm run lint`, `npm test`, `npm run build --prefix server` y `VITE_API_URL=https://api.activaqr.net/api npm run build:site`. Confirmar después el estado del commit en GitHub y Railway. Un despliegue exitoso no demuestra por sí solo que los secretos de los proveedores estén configurados.
