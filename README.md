# ActivaQR

```
 █████╗  ██████╗████████╗██╗██╗   ██╗ █████╗  ██████╗ ██████╗
██╔══██╗██╔════╝╚══██╔══╝██║██║   ██║██╔══██╗██╔═══██╗██╔══██╗
███████║██║        ██║   ██║██║   ██║███████║██║   ██║██████╔╝
██╔══██║██║        ██║   ██║╚██╗ ██╔╝██╔══██║██║▄▄ ██║██╔══██╗
██║  ██║╚██████╗   ██║   ██║ ╚████╔╝ ██║  ██║╚██████╔╝██║  ██║
╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝  ╚═══╝  ╚═╝  ╚═╝ ╚══▀▀═╝ ╚═╝  ╚═╝
```

**Gestión de activos industriales con QR — sin papel, sin excusas.**

---

## Que es ActivaQR

ActivaQR convierte cada máquina de tu planta en un nodo inteligente.
Pegás un código QR en el equipo, cualquier persona con un celular escanea y accede al instante a la ficha técnica completa: temperatura normal, amperaje, estado actual, última medición y responsable.

El personal registrado carga mediciones, registra mantenimientos y recibe alertas cuando algo está fuera de rango — todo desde el celular, sin papel, sin hojas de cálculo perdidas.

---

## Por que ActivaQR gana en el mercado local

El mercado argentino y latinoamericano tiene soluciones de mantenimiento industrial. Ninguna hace lo que hace ActivaQR.

### Competidores directos y sus brechas

| Caracteristica | ActivaQR | CruzarGT (AR) | Sentinello (AR) | Fracttal One (LATAM) | MP Software (LATAM) |
|---|:---:|:---:|:---:|:---:|:---:|
| Ficha publica via QR sin login | **SI** | NO | NO | NO | NO |
| Alertas por umbrales configurables por equipo | **SI** | Solo vencimientos | Parcial (IoT) | No documentado | NO |
| Categorias de parametros por tipo de equipo | **SI** | NO | NO | NO | NO |
| Soporte remoto con intervencion directa | **SI** | NO | NO | NO | NO |
| Chat con fotos y audio | **SI** | NO | NO | NO | NO |
| Mejora de plan desde la app | **SI** | NO | NO | NO | NO |
| Pago local con Mercado Pago | **SI** | NO | NO | NO | NO |
| Multi-tenant para revendedores | **SI** | NO | NO | SI | SI |
| Precio entrada para PyME | **Bajo (ARS)** | ARS $59.000/mes | Sin publicar | USD $279/mes | Sin publicar |

### Lo que ninguno tiene

**Ficha publica sin login.** Todos los competidores requieren que el operario tenga una cuenta y este logueado para ver los datos de un activo. ActivaQR permite que cualquier persona con un celular escanee el QR pegado en la maquina y vea la ficha completa en 3 segundos — sin app, sin contraseña, sin friccion. Ninguna de las soluciones relevadas tiene esta funcionalidad.

**Intervencion remota del soporte tecnico.** Los competidores permiten ver datos. ActivaQR permite que el tecnico de soporte ingrese al sistema del cliente (con permiso aprobado por el cliente), vea sus activos en tiempo real y **registre una medicion directamente**, desencadenando el recalculo automatico de alertas. Es tele-mantenimiento real, no solo visualizacion.

**Plantillas de parametros por categoria de equipo.** Motor diesel, hidraulico, neumatico, electrico, bomba centrifuga, HVAC, IT — cada categoria tiene sus propios parametros con umbrales de alerta, critico y urgente pre-configurados segun normas industriales. Ningun competidor ofrece esto out-of-the-box.

**Adaptado al mercado argentino de verdad.** Mercado Pago para cobro, precios en ARS, interfaz en castellano rioplatense, sin overhead de infraestructura para el cliente. Los competidores internacionales cobran en USD ($279-$649/mes base) o piden demo antes de dar precio.

### Posicionamiento

```
PRECIO
  ^
  |  ActivaQR ----> zona libre: precio local +
  |                              features que no existen
  |
  |  CruzarGT        Sentinello
  |  (compliance)     (IoT grande)
  |
  |                   Fracttal / MP / Tractian
  |                   (enterprise USD)
  +-------------------------------------------------> FEATURES DIFERENCIALES
     bajo                                   alto
```

ActivaQR ocupa una zona que no tiene competidor directo: **precio accesible para PyMEs argentinas con features que solo tienen soluciones enterprise globales** — y con funcionalidades que no existen en ninguna de ellas.

---

## Funcionalidades

**Ficha pública via QR (sin login)**
Cualquier persona escanea el QR pegado en la máquina y accede al nombre del equipo, sector, estado actual, última medición, valores normales de referencia y responsable asignado. Sin app, sin registro.

**Dashboard de planta**
Vista general con el estado de todos los activos: normal / alerta / crítico / mantenimiento. Indicadores por sector, filtros rápidos y acceso directo a cada ficha.

**Registro de mediciones**
El operador registra temperatura, amperaje, presión, vibración y parámetros específicos por categoría de equipo directamente desde su celular. El sistema detecta automáticamente si el valor está fuera de rango.

**Gestión de mantenimientos**
Registro de mantenimientos preventivos y correctivos por activo. Asignación de técnicos, fechas y estado de la tarea. Tareas vencidas marcadas automáticamente.

**Alertas automáticas**
Cuando una medición supera los límites configurados por equipo, el activo cambia de estado en el dashboard. Estados: normal → revisión → urgente.

**Reportes exportables**
Generación de reportes en PDF por activo, sector o planta completa. Incluye historial de mediciones, mantenimientos y estado actual.

**Suscripciones con Mercado Pago**
Débito automático mensual via Mercado Pago Preapproval API. Al generar el link: email automático con diseño personalizado (Resend) y WhatsApp Web con mensaje pre-cargado. Bloqueo inmediato si la suscripción se suspende.

**Multi-tenant real**
Cada empresa tiene sus propios activos, usuarios, sectores y datos completamente aislados. Roles: superadmin / admin / operador.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS (neo-brutalista: bordes gruesos, sombras duras, naranja/negro/blanco) |
| Componentes | Lucide React + Recharts |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Auth | JWT 30 días con verificación en DB por request |
| Pagos | Mercado Pago Preapproval API |
| Email | Resend |
| QR | qrcode.react |
| PDF | jsPDF |
| Deploy Backend | Railway |
| Deploy Frontend | GitHub Pages |
| PWA | vite-plugin-pwa + Workbox |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────────┐  │
│  │  React + Vite (SPA)  │    │  Celular — Escaneo QR    │  │
│  │  GitHub Pages        │    │  Ficha pública (sin auth) │  │
│  └──────────┬───────────┘    └──────────────────────────┘  │
└─────────────┼───────────────────────────────────────────────┘
              │ HTTPS / REST
┌─────────────▼───────────────────────────────────────────────┐
│                    BACKEND (Railway)                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Express + TypeScript                    │   │
│  │                                                      │   │
│  │  /api/auth          → JWT login / registro           │   │
│  │  /api/empresas      → CRUD multi-tenant              │   │
│  │  /api/activos       → Activos + QR                   │   │
│  │  /api/mediciones    → Registro + alertas             │   │
│  │  /api/mantenimientos → Tareas + historial            │   │
│  │  /api/suscripcion   → Mercado Pago Preapproval       │   │
│  │  /api/reportes      → Exportación PDF/CSV            │   │
│  │  /public/:qr        → Ficha pública (sin auth)       │   │
│  └─────────────────────┬───────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │ Prisma ORM
┌────────────────────────▼────────────────────────────────────┐
│                   PostgreSQL (Railway)                      │
│                                                             │
│  Empresa → Usuarios → Activos → Mediciones                 │
│                              → Mantenimientos              │
│                              → Alertas                     │
└─────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
   Mercado Pago               Resend (email)
   Preapproval API            Plantilla HTML
   Webhooks                   + WhatsApp Web
```

---

## Quick Start

### Prerrequisitos

- Node.js >= 18
- PostgreSQL local o en Railway
- Cuenta en Mercado Pago Developers (para pagos)
- Cuenta en Resend (para emails)

### 1. Clonar el repositorio

```bash
git clone https://github.com/jesus1942/ActivaQr.git
cd ActivaQr
```

### 2. Instalar dependencias

```bash
npm install
cd server && npm install
```

### 3. Configurar variables de entorno

```bash
cd server
cp .env.example .env
# Editá el archivo con tus valores
```

### 4. Inicializar la base de datos

```bash
cd server
npx prisma db push
npx prisma generate
npm run seed
```

### 5. Levantar en desarrollo

```bash
# Backend (desde /server)
npm run dev
# → API en http://localhost:3000

# Frontend (desde raíz)
npm run dev
# → App en http://localhost:5173
```

### 6. Build de producción

```bash
# Frontend
npm run build

# Backend
cd server
npm run build
npm start
```

---

## Variables de entorno

### Backend (`/server/.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/activaqr"
JWT_SECRET="secreto_largo_y_aleatorio"
PORT=3000
NODE_ENV=development

MP_ACCESS_TOKEN="APP_USR-..."
MP_PUBLIC_KEY="APP_USR-..."
MP_WEBHOOK_SECRET="webhook_secret"

RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@tudominio.com"

FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
```

### Frontend (`/.env`)

```env
VITE_API_URL="http://localhost:3000"
```

---

## Planes

| | Inicial | Empresa | Industrial |
|---|:---:|:---:|:---:|
| Activos | 10 | 50 | Ilimitados |
| Usuarios | 1 | 5 | Ilimitados |
| Fichas QR publicas | si | si | si |
| Registro de mediciones | si | si | si |
| Gestión de mantenimientos | si | si | si |
| Alertas automáticas | si | si | si |
| Sectores / áreas | — | si | si |
| Importación CSV | — | si | si |
| Fichas activas si cuenta suspendida | — | si | si |
| Soporte prioritario | — | — | si |

Todos los planes incluyen débito automático mensual via Mercado Pago.

---

## Estructura del proyecto

```
ActivaQr/
├── src/                        # Frontend React + TypeScript
│   ├── components/             # Componentes reutilizables
│   ├── pages/                  # Páginas principales
│   ├── hooks/                  # Custom hooks
│   └── data/                   # API clients y tipos
├── server/                     # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/             # Rutas de la API por módulo
│   │   ├── middleware/         # Auth, validación, errores
│   │   └── index.ts            # Entry point del servidor
│   └── prisma/
│       ├── schema.prisma       # Modelos y relaciones
│       └── seed.ts             # Datos de ejemplo
├── public/                     # Assets estáticos
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## Versiones

### v1.1.0
- Sistema de alertas automaticas con umbrales en tiempo real (normal / alerta / critico / urgente)
- Plantillas de parametros por categoria de equipo (8 categorias globales: motor diesel, hidraulico, neumatico, electrico, bomba, HVAC, IT, general)
- Acceso remoto de soporte: panel para abrir cada activo, ver historial e intervenir registrando mediciones
- Chat de soporte con envio de fotos (comprimidas) y audios
- Pagina de Mensajes con notificaciones para cliente y superadmin
- Mejora de plan gestionada dentro de la app (solicitud del cliente + procesamiento del superadmin)
- Modal de WhatsApp con selector de codigo de pais
- Pantalla de carga animada
- Interfaz sin emojis, estilo neo-brutalista consistente

### v1.0.0
- Gestion de activos industriales con QR
- Ficha publica via QR sin login
- Registro de mediciones y mantenimientos
- Multi-tenant con planes y suscripciones Mercado Pago

---

## Licencia

MIT License — Copyright (c) 2024 ActivaQR
