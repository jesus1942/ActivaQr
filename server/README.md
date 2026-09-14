# API de ActivaQR

Backend multi-tenant de ActivaQR, construido con Express, TypeScript, Prisma y PostgreSQL.

La arquitectura completa, las variables de entorno y el procedimiento de despliegue están documentados en el [README principal](../README.md). La configuración de dominio y DNS está en [DEPLOY-DOMINIO.md](../docs/DEPLOY-DOMINIO.md).

## Desarrollo

```bash
npm ci
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

La API local queda disponible en `http://localhost:3001`; el control de estado responde en `GET /api/health`.

## Scripts

| Comando | Uso |
|---|---|
| `npm run dev` | Desarrollo con recarga automática |
| `npm test` | Pruebas del backend |
| `npm run build` | Compilación TypeScript |
| `npm run prisma:generate` | Generación del cliente Prisma |
| `npm run prisma:deploy` | Aplicación de migraciones |
| `npm run start:railway` | Migraciones, datos iniciales y arranque productivo |

## Seguridad multi-tenant

Las rutas privadas requieren JWT. El backend obtiene `empresaId` del usuario autenticado y verifica el estado de la empresa en cada solicitud; el cliente no decide a qué tenant acceder. Las rutas públicas son de solo lectura y exponen únicamente los campos habilitados para cada activo.

### Configuración de seguridad de webhooks

Antes del despliegue, configurar en las variables privadas del servicio de API:

- `MP_WEBHOOK_SECRET`: firma secreta de la aplicación de Mercado Pago que envía las
  notificaciones. `MP_ACCESS_TOKEN` sigue siendo necesario para consultar sus datos.
  `/api/webhooks/mercadopago` exige `x-signature`, `x-request-id` y `data.id` en la
  URL. Ya no acepta IPN sin firma ni IDs tomados solamente del cuerpo.
- `TELEGRAM_WEBHOOK_SECRET`: secreto aleatorio de 1 a 256 caracteres (letras,
  números, guion o guion bajo). Actualizar el registro existente con `setWebhook`
  de Telegram, manteniendo la URL `/api/telegram/webhook` y pasando exactamente
  este valor como `secret_token`. Configurar la variable por sí sola no cambia el
  registro de Telegram. No modificar las demás opciones del webhook existente.

Sin secreto, únicamente el webhook correspondiente devuelve **503**, sin procesar
el evento; la API y los demás módulos siguen funcionando. Una firma o secreto
incorrectos devuelven **401** antes del ACK o de cualquier efecto. Coordinar la
configuración con el despliegue para evitar interrupciones de notificaciones.
Nunca colocar secretos en variables VITE, commits, capturas o registros. Verificar
la entrega con el simulador de Mercado Pago y el estado del webhook de Telegram.
Las pruebas automatizadas usan localhost y no envían mensajes ni pagos reales.

Referencias: [Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications/webhooks)
y [Telegram setWebhook](https://core.telegram.org/bots/api#setwebhook).

Para registrar el secreto desde el runtime sin revelar el token, definir `TELEGRAM_WEBHOOK_AUTO_REGISTER=true` en el servicio propietario del bot. Al iniciar, consulta el webhook, mantiene su URL de ActivaQR, filtros y límite de conexiones, registra el secreto y verifica el destino. No borra actualizaciones pendientes ni toma webhooks de otros sitios. Usa DNS para el dominio y rechaza certificados personalizados. Los logs solo informan éxito o códigos de error sin credenciales.
