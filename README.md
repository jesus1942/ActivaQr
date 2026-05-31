# ⚡ ActivaQR

```
 █████╗  ██████╗████████╗██╗██╗   ██╗ █████╗  ██████╗ ██████╗
██╔══██╗██╔════╝╚══██╔══╝██║██║   ██║██╔══██╗██╔═══██╗██╔══██╗
███████║██║        ██║   ██║██║   ██║███████║██║   ██║██████╔╝
██╔══██║██║        ██║   ██║╚██╗ ██╔╝██╔══██║██║▄▄ ██║██╔══██╗
██║  ██║╚██████╗   ██║   ██║ ╚████╔╝ ██║  ██║╚██████╔╝██║  ██║
╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝  ╚═══╝  ╚═╝  ╚═╝ ╚══▀▀═╝ ╚═╝  ╚═╝
```

**Gestión de activos industriales con QR — sin papel, sin excusas.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Railway](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F97316?style=for-the-badge)](LICENSE)

---

## ¿Qué es ActivaQR?

**ActivaQR convierte cada máquina de tu planta en un nodo inteligente.**
Pegás un código QR en el equipo, cualquier persona con un celular escanea y accede al instante a la ficha técnica completa: temperatura normal, amperaje, estado actual, última medición y responsable.
El personal registrado carga mediciones, registra mantenimientos y recibe alertas cuando algo está fuera de rango — todo desde el celular, sin papel, sin hojas de cálculo perdidas, sin "preguntale al de mantenimiento".

> 🏭 **Para el gerente de planta:** visibilidad total del estado de cada equipo, en tiempo real, desde cualquier dispositivo.
> 👨‍💻 **Para el desarrollador:** API REST tipada, multi-tenant real, pagos recurrentes con Mercado Pago, deploy en Railway en un comando.

---

## 🖼️ Demo

[![Ver demo](https://img.shields.io/badge/🔗%20Ver%20Demo%20en%20Vivo-ActivaQR-F97316?style=for-the-badge)](https://tudominio.github.io/activaqr)

> Escaneá el QR de ejemplo con tu celular y experimentá la ficha pública de un activo industrial sin registrarte.

---

## ✨ Funcionalidades

### 📱 Ficha pública vía QR (sin login)
- Cualquier persona con un celular escanea el QR pegado en la máquina
- Accede instantáneamente a: nombre del equipo, sector, estado actual, última medición registrada, valores normales de referencia y responsable asignado
- Sin app. Sin registro. Solo el celular y el QR

### 📊 Dashboard de planta
- Vista general con el estado de todos los activos: **normal / alerta / crítico / mantenimiento**
- Indicadores por sector, filtros rápidos y acceso directo a cada ficha
- Diseñado para verse en un monitor de control y en celular al mismo tiempo

### 🔬 Registro de mediciones
- El operador registra temperatura, amperaje, presión y vibración directamente desde su celular
- El sistema detecta automáticamente si el valor está fuera del rango normal y genera una alerta
- Historial completo por activo con gráficos de tendencia (Recharts)
- Importación masiva vía CSV

### 🔧 Gestión de mantenimientos
- Registro de mantenimientos preventivos y correctivos por activo
- Asignación de técnicos, fechas y estado de la tarea
- Tareas vencidas marcadas automáticamente
- Historial auditable por equipo

### 🚨 Alertas automáticas
- Notificación instantánea cuando una medición supera los límites configurados por equipo
- Estados: `normal` → `revisión` → `urgente`
- El activo cambia de color en el dashboard en tiempo real

### 📈 Reportes exportables
- Generación de reportes en PDF por activo, sector o planta completa
- Incluye historial de mediciones, mantenimientos y estado actual
- Listo para auditorías y certificaciones ISO

### 💳 Suscripciones con Mercado Pago
- Débito automático mensual via Mercado Pago Preapproval API
- Al generar el link de suscripción: **email automático** con diseño personalizado (Resend) + **WhatsApp Web** con mensaje pre-cargado listo para enviar
- Bloqueo inmediato si la suscripción se suspende: el token JWT se verifica contra la DB en cada request
- **Excepción inteligente:** en planes Empresa e Industrial, las fichas QR públicas siguen accesibles aunque la cuenta esté suspendida — quien esté en la planta puede seguir escaneando

### 🏢 Multi-tenant real
- Cada empresa tiene sus propios activos, usuarios, sectores y datos completamente aislados
- Roles: `superadmin` / `admin` / `operador`
- El superadmin gestiona todas las empresas desde un panel separado

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilos** | Tailwind CSS (diseño neo-brutalista: bordes gruesos, sombras duras, paleta naranja/negro/blanco) |
| **Componentes** | Lucide React + Recharts |
| **Backend** | Node.js + Express + TypeScript |
| **Base de datos** | PostgreSQL + Prisma ORM (migraciones tipadas) |
| **Auth** | JWT (30 días de expiración) con verificación en DB por request |
| **Pagos** | Mercado Pago Preapproval API (suscripciones recurrentes) |
| **Email** | Resend (plantilla HTML personalizada) |
| **QR** | `qrcode.react` — generación por activo, descargable |
| **PDF** | jsPDF — reportes generados en el cliente |
| **Deploy Backend** | Railway (con `prisma db push` + seed automático al arrancar) |
| **Deploy Frontend** | GitHub Pages |
| **PWA** | `vite-plugin-pwa` + Workbox — instalable en celular |

---

## 🏗️ Arquitectura

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

## 🚀 Quick Start

### Prerrequisitos

- Node.js >= 18
- PostgreSQL corriendo localmente (o una DB en Railway)
- Cuenta en [Mercado Pago Developers](https://developers.mercadopago.com/) (para pagos)
- Cuenta en [Resend](https://resend.com/) (para emails)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tuusuario/activaqr.git
cd activaqr
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Instalar dependencias del backend

```bash
cd server
npm install
```

### 4. Configurar variables de entorno

```bash
# En /server
cp .env.example .env
# Editá el archivo con tus valores (ver sección de variables abajo)
```

### 5. Inicializar la base de datos

```bash
cd server
npx prisma migrate dev --name init
npm run seed          # Carga datos de ejemplo
npx prisma generate
```

### 6. Levantar el backend

```bash
# Desde /server
npm run dev
# → API corriendo en http://localhost:3000
```

### 7. Levantar el frontend

```bash
# Desde la raíz del proyecto
npm run dev
# → App corriendo en http://localhost:5173
```

### 8. (Opcional) Build de producción

```bash
# Frontend
npm run build        # Genera /dist listo para GitHub Pages

# Backend
cd server
npm run build        # Compila TypeScript a /dist
npm start
```

---

## 🔐 Variables de entorno

### Backend (`/server/.env`)

```env
# ── Base de datos ──────────────────────────────────────
DATABASE_URL="postgresql://usuario:password@localhost:5432/activaqr"

# ── Autenticación ──────────────────────────────────────
JWT_SECRET="tu_secreto_muy_largo_y_aleatorio_aqui"

# ── Servidor ───────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Mercado Pago ───────────────────────────────────────
MP_ACCESS_TOKEN="APP_USR-..."           # Token de acceso de tu app en MP
MP_PUBLIC_KEY="APP_USR-..."             # Clave pública
MP_WEBHOOK_SECRET="tu_webhook_secret"   # Para verificar notificaciones de MP

# ── Resend (emails) ────────────────────────────────────
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@tudominio.com"

# ── URLs ───────────────────────────────────────────────
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"
```

### Frontend (`/.env`)

```env
VITE_API_URL="http://localhost:3000"
```

> **Nota de seguridad:** Nunca commitees `.env` al repositorio. El `.gitignore` ya los excluye.

---

## 💰 Planes y Pricing

| | 🟢 Inicial | 🔵 Empresa | 🟠 Industrial |
|---|:---:|:---:|:---:|
| **Activos** | 10 | 50 | Ilimitados |
| **Usuarios** | 1 | 5 | Ilimitados |
| **Fichas QR públicas** | ✅ | ✅ | ✅ |
| **Registro de mediciones** | ✅ | ✅ | ✅ |
| **Gestión de mantenimientos** | ✅ | ✅ | ✅ |
| **Dashboard de planta** | ✅ | ✅ | ✅ |
| **Reportes exportables** | ✅ | ✅ | ✅ |
| **Alertas automáticas** | ✅ | ✅ | ✅ |
| **Sectores / áreas** | — | ✅ | ✅ |
| **Importación CSV** | — | ✅ | ✅ |
| **Fichas públicas activas si cuenta suspendida** | — | ✅ | ✅ |
| **Soporte prioritario** | — | — | ✅ |
| **Pago mensual** | AR$ consultar | AR$ consultar | AR$ consultar |

> Todos los planes incluyen débito automático mensual vía Mercado Pago.
> El bloqueo de acceso es inmediato ante suspensión — cada request verifica el estado en DB.
> En planes Empresa e Industrial, las fichas QR públicas permanecen accesibles para el personal de planta aunque la cuenta esté suspendida.

---

## 🎯 ¿Por qué ActivaQR?

### El problema que resuelve

En la mayoría de las plantas industriales argentinas, la gestión de activos todavía vive en hojas de cálculo, cuadernos de papel o sistemas ERP caros y complejos que nadie usa bien. El resultado: información desactualizada, mantenimientos olvidados, fallas no previstas y auditorías que se convierten en una pesadilla.

### Lo que nos diferencia

**🔍 Acceso instantáneo sin fricción**
El QR lo escanea cualquiera con cualquier celular. Sin descargar apps, sin crear cuentas, sin recordar contraseñas. El operario en el piso de la planta tiene la información en 3 segundos.

**⚡ Alertas que llegan antes de que se rompa algo**
Cuando una medición supera los límites configurados, el sistema lo marca inmediatamente. El activo cambia de color en el dashboard. No hay que esperar a que alguien lo note.

**💳 Modelo de negocio sin fricción**
El link de suscripción se genera en un click y llega por email y WhatsApp al mismo tiempo. El cobro es automático mes a mes via Mercado Pago. Sin facturas manuales, sin seguimiento, sin olvidos.

**🏢 Multi-tenant de verdad**
Cada empresa ve únicamente sus datos. El aislamiento es a nivel de base de datos (por `empresaId` en cada query via Prisma), no solo a nivel de interfaz.

**🔒 Seguridad sin compromisos**
El JWT no solo expira: se verifica contra el estado activo/suspendido de la empresa en cada request. Si una suscripción se cancela, el acceso se corta de inmediato aunque el token todavía sea válido temporalmente.

**🧱 Stack moderno y mantenible**
TypeScript de punta a punta (frontend y backend), Prisma con migraciones tipadas, Vite para builds ultrarrápidos. Un desarrollador nuevo puede levantar el proyecto y entender la estructura en menos de una hora.

**📱 PWA instalable**
El frontend es una Progressive Web App. El operario puede "instalarla" en su celular desde el navegador y usarla como si fuera una app nativa, incluso con conectividad limitada.

---

## 🗺️ Roadmap

### v1.1
- [ ] Notificaciones push vía web (Service Worker)
- [ ] Integración con sensores IoT (MQTT) para mediciones automáticas
- [ ] App móvil nativa (React Native)

### v1.2
- [ ] Análisis predictivo de fallas basado en histórico de mediciones
- [ ] Integración con sistemas ERP (SAP, Odoo)
- [ ] API pública documentada con Swagger para integraciones de terceros

### v1.3
- [ ] Dashboard ejecutivo con KPIs de planta (MTBF, MTTR, OEE)
- [ ] Firma digital de mantenimientos
- [ ] Módulo de gestión de repuestos e inventario

---

## 📁 Estructura del proyecto

```
activaqr/
├── src/                        # Frontend React + TypeScript
│   ├── components/             # Componentes reutilizables
│   ├── pages/                  # Páginas / vistas principales
│   ├── hooks/                  # Custom hooks
│   ├── services/               # Llamadas a la API
│   └── types/                  # Tipos TypeScript compartidos
├── server/                     # Backend Express + TypeScript
│   ├── src/
│   │   ├── routes/             # Rutas de la API (por módulo)
│   │   ├── middleware/         # Auth, validación, manejo de errores
│   │   ├── services/           # Lógica de negocio
│   │   └── index.ts            # Entry point del servidor
│   ├── prisma/
│   │   ├── schema.prisma       # Modelos y relaciones de la DB
│   │   ├── migrations/         # Historial de migraciones
│   │   └── seed.ts             # Datos de ejemplo para desarrollo
│   └── railway.json            # Configuración de deploy en Railway
├── public/                     # Assets estáticos
├── index.html                  # Entry point HTML
├── vite.config.ts              # Configuración de Vite + PWA
├── tailwind.config.js          # Configuración de Tailwind CSS
└── tsconfig.json               # Configuración de TypeScript
```

---

## 🤝 Contribuir

1. Forkea el repositorio
2. Creá una rama para tu feature: `git checkout -b feature/nombre-del-feature`
3. Commiteá tus cambios con mensajes descriptivos
4. Abrí un Pull Request describiendo qué cambiaste y por qué

Por favor, seguí el estilo de código existente (TypeScript estricto, sin `any`, commits en español o inglés).

---

## 📄 Licencia

Este proyecto está bajo la [Licencia MIT](LICENSE).

```
MIT License — Copyright (c) 2024 ActivaQR

Se permite usar, copiar, modificar, fusionar, publicar, distribuir,
sublicenciar y/o vender copias del software, sujeto a que el aviso
de copyright aparezca en todas las copias.
```

---

<div align="center">

**Hecho con ⚡ y mucho café en Argentina**

[Reportar un bug](https://github.com/tuusuario/activaqr/issues) · [Solicitar una feature](https://github.com/tuusuario/activaqr/issues) · [Contacto comercial](mailto:contacto@activaqr.com)

</div>
