```
          ╲╲╲                                     ╱╱╱
       ╲╲╲╲╲╲                                     ╱╱╱╱╱╱
═════════════   ▄▀█ █▀▀ ▀█▀ █ █ █ ▄▀█   █▀█ █▀█   ═════════════
       ╱╱╱╱╱╱   █▀█ █▄▄  █  █ ▀▄▀ █▀█   ▀▀█ █▀▄   ╲╲╲╲╲╲
          ╱╱╱                                     ╲╲╲

            A C T I V O S   B A J O   C O N T R O L
```

**Gestión de activos industriales con QR — sin papel, sin excusas.**

[activaqr.net](https://activaqr.net) · API en [api.activaqr.net](https://api.activaqr.net) · 30 días gratis, sin tarjeta

---

## Qué es ActivaQR

Pegás un código QR en la máquina. Cualquiera con un celular lo escanea y ve la ficha del equipo al instante: qué es, dónde está, cómo viene funcionando, la última medición y a quién llamar si algo anda mal. Sin instalar nada, sin contraseña.

El personal registrado carga mediciones desde el celular —aunque no haya señal—, registra mantenimientos y recibe alertas cuando un valor se va de rango. Todo queda en el sistema: sin planillas perdidas, sin cuadernos mojados, sin "me parece que la cambiamos el año pasado".

---

## Por qué gana en el mercado local

El mercado argentino y latinoamericano tiene soluciones de mantenimiento industrial. Ninguna hace lo que hace ActivaQR.

| Característica | ActivaQR | CruzarGT (AR) | Sentinello (AR) | Fracttal One | MaintainX | UpKeep |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Ficha pública vía QR sin login | **SI** | NO | NO | NO | NO | NO |
| Catálogo de fallas por tipo de equipo | **SI** | NO | NO | NO | NO | NO |
| Alertas por umbrales configurables por equipo | **SI** | Solo vencimientos | Parcial (IoT) | Parcial | SI | SI |
| Soporte remoto con intervención directa | **SI** | NO | NO | NO | NO | NO |
| Carga offline con sincronización automática | **SI** | NO | NO | Parcial | SI | Parcial |
| Pago local con Mercado Pago | **SI** | SI | NO | NO | NO | NO |
| Multi-tenant para revendedores | **SI** | NO | NO | SI | NO | NO |
| Precio de entrada | **USD 20** | ARS $59.000 | Sin publicar | USD 195+ | USD 16/usuario | USD 35/usuario |

### Lo que ninguno tiene

**Ficha pública sin login.** Todos los competidores exigen cuenta y sesión iniciada para ver los datos de un activo. En ActivaQR el operario escanea y ve la ficha en tres segundos. Y el dueño decide, activo por activo, qué se muestra y qué no.

**Catálogo de fallas en el QR.** El técnico busca el síntoma que está viendo y obtiene causas probables ordenadas por probabilidad, con la solución paso a paso. Motor diésel, cinta transportadora, aerogenerador, autoelevador y más. Ninguna solución relevada trae esto de fábrica.

**Intervención remota del soporte.** Los competidores permiten ver datos. Acá el técnico de soporte entra al sistema del cliente —con permiso aprobado por el cliente— y registra una medición, disparando el recálculo de alertas. Es tele-mantenimiento real.

**Pensado para el campo argentino.** En el pad, en el socavón o en la cámara muchas veces no hay señal: la medición queda en el celular y sube sola cuando vuelve la conexión, con la hora y la ubicación reales del momento en que se midió.

---

## Planes

| | Inicial | Empresa | Industrial |
|---|:---:|:---:|:---:|
| **Precio** | **USD 20/mes** | **USD 69/mes** | **USD 179/mes** |
| Activos | 10 | 100 | Ilimitados |
| Técnicos | 2 | 10 | Ilimitados |
| Fichas QR públicas | si | si | si |
| Mediciones y mantenimientos | si | si | si |
| Alertas automáticas | si | si | si |
| Reportes PDF y CSV | si | si | si |
| Sectores e importación CSV | — | si | si |
| Soporte remoto incluido | — | si | si |
| Fichas activas con cuenta suspendida | — | si | si |
| Soporte prioritario | — | — | si |

Todos con 30 días gratis sin tarjeta y débito automático mensual por Mercado Pago. Se cobra en pesos al tipo de cambio del día, sin costo de instalación ni permanencia mínima.

**Plan Gestionado** (a medida): para plantas que no tienen personal disponible para tomar las mediciones. Incluye todo lo de Industrial más visitas técnicas presenciales periódicas y el informe mensual. Se cotiza por visita según distancia y cantidad de equipos.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS |
| Componentes | Lucide React + Recharts |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM (migraciones versionadas) |
| Auth | JWT + verificación de estado de empresa en cada request |
| Pagos | Mercado Pago Preapproval API (webhook con firma HMAC) |
| Email | Resend |
| Notificaciones | Web Push (VAPID) + Telegram Bot |
| QR / PDF | qrcode.react · jsPDF |
| PWA | vite-plugin-pwa + Workbox (offline first) |
| Deploy frontend | GitHub Pages · dominio propio |
| Deploy backend | Railway |

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                            CLIENTES                              │
│                                                                  │
│   activaqr.net                        Celular en planta          │
│   PWA React (GitHub Pages)            Escaneo QR → ficha         │
│   Login · offline · push              pública (sin login)        │
└──────────────────┬───────────────────────────────────────────────┘
                   │  HTTPS / REST
┌──────────────────▼───────────────────────────────────────────────┐
│                   api.activaqr.net  (Railway)                    │
│                                                                  │
│   Express + TypeScript                                           │
│     /api/auth         login · registro trial · recuperación      │
│     /api/activos      activos, QR y visibilidad pública          │
│     /api/mediciones   registro + motor de alertas                │
│     /api/tareas       mantenimientos y vencimientos              │
│     /api/fallas       catálogo de fallas por categoría           │
│     /api/acceso-remoto  soporte con permiso del cliente          │
│     /api/webhooks     Mercado Pago (firma HMAC verificada)       │
│     /api/public       ficha pública — solo lectura, sin auth     │
│     /                 landing comercial                          │
└──────────────────┬───────────────────────────────────────────────┘
                   │  Prisma ORM
┌──────────────────▼───────────────────────────────────────────────┐
│                     PostgreSQL (Railway)                         │
│   Empresa → Usuarios → Activos → Mediciones · Tareas · Fotos     │
│           → Sedes · Sectores · Categorías · Auditoría            │
└──────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
    Mercado Pago           Resend             Web Push · Telegram
    suscripciones          emails             avisos al superadmin
```

Cada empresa ve únicamente sus datos: el `empresaId` se resuelve desde el token en cada request, nunca desde el cliente.

---

## Quick Start

**Requisitos:** Node.js >= 18 y PostgreSQL (local o Railway).

```bash
git clone https://github.com/jesus1942/ActivaQr.git
cd ActivaQr

npm install
cd server && npm install
```

Configurar el backend:

```bash
cd server
cp .env.example .env    # editar con los valores propios
npx prisma migrate deploy
npx prisma generate
npm run seed
```

Levantar en desarrollo:

```bash
cd server && npm run dev   # API en http://localhost:3001
npm run dev                # App en http://localhost:5173 (desde la raíz)
```

Build de producción:

```bash
npm run build                    # frontend → dist/
cd server && npm run build       # backend  → dist/
```

---

## Variables de entorno

### Backend (`server/.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/activaqr"
JWT_SECRET="secreto_largo_y_aleatorio"
NODE_ENV=development
PORT=3001

# Superadmin. Sin SUPERADMIN_PASSWORD no se crea ni se modifica ninguna
# contraseña: el repositorio es público y no lleva credenciales por defecto.
SUPERADMIN_EMAIL="tu@email.com"
SUPERADMIN_PASSWORD="..."

# Dominios propios
APP_PUBLIC_URL="https://activaqr.net/"
ALLOWED_ORIGINS="https://activaqr.net,https://www.activaqr.net"

# Mercado Pago
MP_ACCESS_TOKEN="APP_USR-..."
MP_WEBHOOK_SECRET="..."          # activa la verificación de firma
MP_BACK_URL="https://activaqr.net/"

# Email y avisos
RESEND_API_KEY="re_..."
RESEND_FROM="ActivaQR <avisos@activaqr.net>"
LEAD_EMAIL="tu@email.com"
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_ADMIN_CHAT_ID="..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:tu@email.com"
```

### Frontend (`.env` o secrets de GitHub Actions)

```env
VITE_API_URL="https://api.activaqr.net"
VITE_BASE="/"                    # "/ActivaQr/" si se sirve sin dominio propio
```

La URL de la API se normaliza sola: funciona con o sin `https://`, con o sin `/api` al final.

---

## Despliegue

El frontend se publica en GitHub Pages con cada push a `main` (workflow `deploy.yml`), que verifica antes de publicar que el bundle realmente apunte a la API. El backend se despliega en Railway desde la misma rama, aplicando las migraciones de Prisma al arrancar.

La guía completa de DNS, dominios y servicios externos está en [`docs/DEPLOY-DOMINIO.md`](docs/DEPLOY-DOMINIO.md).

---

## Seguridad

- Contraseñas con bcrypt; sin credenciales por defecto en el repositorio.
- Tokens de recuperación guardados hasheados: una copia de la base no sirve para tomar cuentas.
- CORS por lista blanca con comparación exacta de origen.
- Límites de uso por IP en login, registro, alta de leads y analítica.
- Webhooks de Mercado Pago con firma HMAC verificada, y re-consulta a la API antes de aplicar cambios.
- Rutas públicas de solo lectura: nada se modifica sin token válido y empresa activa.
- Visibilidad de la ficha pública configurable por activo, con valores conservadores por defecto.

---

## Modelo de negocio

### Costos e ingresos

Con comisión de Mercado Pago (~8% con IVA) e impuestos provinciales y retenciones (~6%), el neto aproximado por cliente es:

| Plan | Cobra | Neto estimado |
|---|---:|---:|
| Inicial | USD 20 | ~USD 17 |
| Empresa | USD 69 | ~USD 59 |
| Industrial | USD 179 | ~USD 154 |

Costo fijo de infraestructura: **~USD 6/mes** (Railway 5 + dominio 1; Resend y GitHub Pages sin cargo en este volumen). Un solo cliente del plan más chico ya cubre toda la operación.

La infraestructura crece mucho más despacio que la facturación: la app mueve texto y números, y las fotos van comprimidas. El único costo que escala sin techo es el almacenamiento de imágenes; cuando pese, se migra a un servicio de archivos dedicado.

### Fiscal (Argentina)

Conviene arrancar como **Monotributo**: simple, barato y emite factura, que es lo que las empresas piden. Dos cuidados: lo que ingresa por Mercado Pago cuenta para el tope de facturación y ARCA lo ve, y la recategorización es semestral (enero y julio). Al superar el tope corresponde pasar a Responsable Inscripto y evaluar constituir una SAS. **Consultar con un contador antes de facturar.**

Como los costos son en dólares y el cobro es en pesos, conviene revisar los montos en ARS cada tres o cuatro meses.

### Dos formas de vender

1. **SaaS puro** — el cliente usa la plataforma y paga la suscripción. Escala sin sumar horas de trabajo.
2. **Servicio gestionado** — las mediciones las toma ActivaQR con visitas periódicas. No escala igual, pero abre la puerta en plantas que no quieren aprender un sistema nuevo, y el informe mensual en PDF es el entregable que justifica el cobro.

> "Yo me encargo de todo. Vengo una vez por mes, tomo las mediciones de cada equipo, el sistema evalúa si hay algo fuera de rango y te mando el informe al otro día. Si aparece una alerta crítica antes de la visita, te aviso por WhatsApp."

### Mercado objetivo

Empresas de **20 a 200 activos**: contratistas medianos y mantenimiento industrial en Patagonia (Neuquén, Río Negro, Chubut), petróleo no convencional y minería. La venta se gana con la demo del QR en vivo, no con la lista de features.

---

## Estructura del proyecto

```
ActivaQr/
├── src/                    # Frontend React + TypeScript
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Páginas (carga diferida por ruta)
│   ├── hooks/              # Custom hooks
│   ├── context/            # Auth, tema, toasts
│   └── data/               # Clientes de API, tipos, cola offline
├── server/                 # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/         # Rutas de la API por módulo
│   │   ├── landing.ts      # Landing comercial server-side
│   │   └── index.ts        # Entry point
│   └── prisma/
│       ├── schema.prisma   # Modelos y relaciones
│       └── migrations/     # Migraciones versionadas
├── docs/                   # Documentación de base y despliegue
├── public/                 # Assets estáticos y service worker de push
└── .github/workflows/      # Deploy automático a GitHub Pages
```

---

## Versiones

**v1.1.0** — Alertas con umbrales en tiempo real · plantillas de parámetros por categoría de equipo · catálogo de fallas · acceso remoto de soporte con intervención directa · chat con fotos y audio · mejora de plan desde la app · carga offline con sincronización · dominio propio y notificaciones de alta.

**v1.0.0** — Gestión de activos con QR · ficha pública sin login · mediciones y mantenimientos · multi-tenant con suscripciones de Mercado Pago.

---

## Roadmap v2.0

**Seguimiento GPS — Fase 1 (celular).** El técnico responsable queda inscripto en el activo antes de salir; el celular envía posición cada cierto tiempo. Historial de recorrido y alertas por zona y velocidad, sin hardware extra.

**Seguimiento GPS — Fase 2 (hardware IoT).** Dispositivo GPS + SIM conectado al activo, con mediciones automáticas. Conectividad Starlink para zonas sin señal celular.

**Mantenimiento predictivo.** Análisis de tendencias sobre el historial de mediciones para alertar antes de la falla, no después.

El mercado para GPS en Vaca Muerta lo piden las operadoras por contrato a sus contratistas, y hoy se cobra entre $38.000 y $52.000 ARS por vehículo por mes. La oportunidad está en los contratistas de 50 a 200 vehículos sin sistema formal de gestión de flota.

---

## Licencia

MIT License — Copyright (c) 2026 ActivaQR
