```
╔══════════════════════════════════════════════════════╗
║  ██████╗  ██████╗       ██████╗ ██████╗             ║
║  ██╔══██╗██╔═══██╗     ██╔═══██╗██╔══██╗            ║
║  ██████╔╝██║   ██║     ██║   ██║██████╔╝            ║
║  ██╔══██╗██║   ██║     ██║▄▄ ██║██╔══██╗            ║
║  ██║  ██║╚██████╔╝     ╚██████╔╝██║  ██║            ║
║  ╚═╝  ╚═╝ ╚═════╝       ╚══▀▀═╝ ╚═╝  ╚═╝           ║
║                                                      ║
║  ACTIVOS BAJO CONTROL                                ║
╚══════════════════════════════════════════════════════╝
```

> *"Cada máquina con su historia. Cada mantenimiento con evidencia. Cada falla antes de que suceda."*

---

## ¿QUÉ ES?

ActivaQR es una plataforma SaaS de gestión de activos industriales pensada para empresas de la Patagonia argentina.

**El problema:** en muchas empresas el mantenimiento se lleva en cuadernos, WhatsApp, la memoria del empleado o planillas incompletas. Una máquina parada cuesta mucho más que haberla revisado a tiempo.

**La solución:** generás a cada activo — desde un motor de hormigonera hasta el equipo más sofisticado — una ficha propia con su código QR. El técnico escanea en campo, carga los valores, y la app hace el resto: historial, alertas, reportes y avisos de mantenimiento antes de que algo te explote o te pare la producción.

---

## MÓDULOS

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   DASHBOARD     │  │    ACTIVOS      │  │   MEDICIONES    │
│                 │  │                 │  │                 │
│ · Alertas       │  │ · Fichas QR     │  │ · Carga campo   │
│ · Estado flota  │  │ · Historial     │  │ · Temperatura   │
│ · Actividad     │  │ · Tendencias    │  │ · Amperaje      │
│   reciente      │  │ · Ficha técnica │  │ · Presión       │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ MANTENIMIENTO   │  │   REPORTES      │  │   GESTIÓN QR    │
│                 │  │                 │  │                 │
│ · Tareas        │  │ · PDF para      │  │ · Generación    │
│ · Vencidas      │  │   gerencia      │  │ · Impresión     │
│ · Programadas   │  │ · Auditorías    │  │ · Etiquetas     │
│ · Historial     │  │ · Seguros       │  │   físicas       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## STACK

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS |
| Gráficos | Recharts |
| PDF | jsPDF |
| Routing | React Router v6 (HashRouter) |
| Backend | Node.js + Express + Prisma ORM |
| Base de datos | PostgreSQL (Railway) |
| Auth | JWT + bcryptjs |
| Deploy frontend | GitHub Pages + GitHub Actions |
| Deploy backend | Railway |
| PWA | vite-plugin-pwa |

---

## ARQUITECTURA

```
┌─────────────────────────────────────────────────────────┐
│                    GITHUB PAGES                         │
│              React SPA (PWA instalable)                 │
│                                                         │
│  Superadmin Panel ──┐                                   │
│  Dashboard          ├──► authHeaders() ──► JWT Token    │
│  Activos            │                                   │
│  Mediciones         │                                   │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│                     RAILWAY                             │
│              Express API + PostgreSQL                   │
│                                                         │
│  /api/auth/login    POST  → JWT                         │
│  /api/admin/*       CRUD  → requireSuperadmin           │
│  /api/activos/*     CRUD  → requireAuth + empresaId     │
│  /api/mediciones/*  CRUD  → requireAuth + empresaId     │
│  /api/sync/*        PUT   → bulk upsert                 │
└─────────────────────────────────────────────────────────┘
```

**Multi-tenant:** cada empresa ve únicamente sus propios datos. El token JWT incluye `empresaId` — todos los queries en el backend filtran por ese valor automáticamente.

**Roles:**
- `superadmin` — propietario de la plataforma, gestiona todas las empresas
- `admin` — administrador de empresa, acceso completo a sus datos
- `operador` — técnico de campo, carga mediciones

---

## ACTIVOS SOPORTADOS

Cualquier equipo con valores medibles y necesidad de mantenimiento:

```
Motores eléctricos    │ Compresores           │ Bombas centrífugas
Cámaras frigoríficas  │ Tableros eléctricos   │ Grupos electrógenos
Cintas transportadoras│ Puentes grúa          │ Rodamientos
Calderas              │ Variadores frecuencia │ Motores navales
Máquinas viales       │ Equipos refrigeración │ Y lo que sea medible
```

---

## CORRER LOCALMENTE

```bash
# Frontend
git clone https://github.com/jesus1942/ActivaQr.git
cd ActivaQr
npm install
npm run dev
# → http://localhost:5173  (modo local con localStorage)

# Backend
cd server
npm install
npx prisma db push
npm run dev
# → http://localhost:3001
```

**Variables de entorno para el backend (`server/.env`):**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secreto
SUPERADMIN_EMAIL=tu@email.com
SUPERADMIN_PASSWORD=tu-clave
```

---

## ROADMAP

```
[✓] MVP: activos, mediciones, QR, alertas
[✓] Deploy en GitHub Pages
[✓] Backend Railway + PostgreSQL
[✓] Multi-empresa con auth JWT
[✓] Panel superadmin
[✓] PWA instalable (iOS / Android)
[ ] App móvil nativa (React Native)
[ ] Integración OPC UA / MQTT
[ ] Análisis predictivo con tendencias automáticas
[ ] Módulo de repuestos e inventario
[ ] Órdenes de trabajo
[ ] Notificaciones push
[ ] Integración SAP / Tango / ERP
```

---

## CONTEXTO

Esta app fue pensada para el contexto industrial de la Patagonia argentina: pesqueras, frigoríficos, hormigoneras, constructoras, transporte, servicios petroleros, generación de energía. Lugares donde el mantenimiento es crítico, donde una parada no programada tiene costo real, y donde la gestión de activos todavía tiene mucho para mejorar.

La idea original es de **Natalia** — alguien que vio de cerca cómo se maneja el mantenimiento industrial en la práctica y entendió que había una forma mejor de hacerlo.

---

*ActivaQR — Puerto Madryn, Patagonia Argentina.*

---

<sub>Desarrollado por **[Jesús Olguín](https://jesus1942.github.io/portfolio/)** · v1.0.0</sub>
