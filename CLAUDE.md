# ActivaQR — Contexto del proyecto para Claude

## Que es
SaaS multi-tenant de gestion de activos industriales con QR. Cada empresa carga sus equipos, les pega un QR fisico, y desde ese QR cualquier persona ve la ficha tecnica publica sin login. El equipo tecnico carga mediciones, el sistema evalua alertas automaticamente, y hay soporte remoto real con chat de fotos/audio.

## Stack
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS, desplegado en GitHub Pages
- **Backend:** Node.js + Express + TypeScript, desplegado en Railway
- **Base de datos:** PostgreSQL via Prisma ORM (Railway)
- **Pagos:** Mercado Pago (suscripciones recurrentes)
- **Email:** Resend (solo puede enviar a chucky9425@gmail.com en plan free — requiere dominio verificado para enviar a otros)
- **Push:** Web Push API con VAPID
- **PWA:** vite-plugin-pwa + Workbox

## Dueno del proyecto
Jesus (chucky9425@gmail.com, WhatsApp: +5492804018359). Autodidacta de Neuquen, Argentina.

## Reglas criticas de UI
- **CERO emojis** en codigo, UI, commits o cualquier artefacto. Si hay iconos, que sean de lucide-react.
- Estilo neo-brutalista: border-2 border-slate-900, shadow-[4px_4px_0px_0px_#1e293b], naranja #f97316
- Font especial para titulos: font-sketch (clase CSS personalizada)
- Sin comentarios innecesarios en el codigo

## Autenticacion
- JWT en sessionStorage (no localStorage) — la sesion muere al matar la app, no al minimizar
- TOKEN_TTL = 7d, DEMO_TOKEN_TTL = 2h
- Demo: demo@activaqr.com / demo1234 (auto-rellena con ?demo=1 en la URL)

## Arquitectura multi-tenant
- Cada query al backend filtra por empresaId del JWT
- Roles: superadmin (Jesus), admin (dueno de empresa), operador
- Planes: inicial (10 activos), empresa (hasta 100 activos), industrial (mas de 500 activos)

## API
- `apiFetch(path)` — el path NO incluye 'api/' prefix
- Backend en Railway, frontend en GitHub Pages
- CORS configurado via variable ALLOWED_ORIGINS

## Variables de entorno importantes (Railway)
- DATABASE_URL
- JWT_SECRET
- RESEND_API_KEY, RESEND_FROM, RESEND_FROM_EMAIL, LEAD_EMAIL
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
- MP_ACCESS_TOKEN (Mercado Pago)
- WHATSAPP_NUMERO=5492804018359
- APP_PUBLIC_URL=https://jesus1942.github.io/ActivaQr/
- ALLOWED_ORIGINS=https://jesus1942.github.io,https://activaqr-production.up.railway.app

## Flujo de leads (landing)
- Usuario llena formulario → POST /api/leads
- Email a LEAD_EMAIL con reply-to del lead (para que Jesus pueda responder directo)
- Boton WhatsApp en el email (abre app en mobile, WhatsApp Web en escritorio)
- Push notification al superadmin con email y telefono del lead

## Roadmap v2.0 — GPS tracking (NO implementar aun)
El usuario quiere agregar seguimiento GPS para activos moviles en una version futura.

**Arquitectura planeada:**
- Fase 1 (celular): el operador activa "modo tracking" en la app, manda posicion GPS cada X minutos
- Fase 2 (hardware): dispositivo GPS + SIM (Teltonika FMB920, ~USD 80) enchufado al activo
- Fase 3 (Starlink): cobertura en zonas sin señal celular — cuencas petroleras, Patagonia

**Mercado objetivo:**
- Vaca Muerta / Neuquen / Rio Negro — campo petroleo no convencional
- USD 10.000M inversion anual, miles de vehiculos en operacion
- Operadoras (YPF, Chevron, Shell) exigen GPS tracking contractualmente a contratistas
- Precio de mercado: $38.000-$52.000 ARS/vehiculo/mes (competidores: Smarttrack, Vtracking, Ubicar)
- Starlink tiene adopcion masiva en campo petrolero argentino
- Oportunidad: contratistas medianos (50-200 vehiculos) sin sistema formal de gestion de flota

**Lo que se necesitaria agregar al schema:**
- Campo `posicion` (lat/lng) en Medicion o modelo `UbicacionGPS` separado
- Vista de mapa con React Leaflet
- Endpoint de streaming de posicion

**Instruccion:** No implementar hasta que la v1 este facturando. Primero probar con cobertura celular y hardware simple.

## Notas importantes
- `prisma db push` en Railway (sin migraciones formales)
- seedDemo() crea empresa "Demo ActivaQR" con 4 activos de ejemplo
- La rama de desarrollo activa es `claude/intelligent-brown-SYt6A`, se mergea a main para deploy
- GitHub Actions despliega frontend a GitHub Pages automaticamente en push a main
- Railway redespliega el backend automaticamente en push a main
