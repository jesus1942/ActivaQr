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

Base operativa: **Puerto Madryn, Chubut, Argentina**. Cobertura comercial: Patagonia y resto del país.

---

## Índice

- [Qué es ActivaQR](#qué-es-activaqr)
- [Capacidades y planes](#planes)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Aislamiento multi-tenant y permisos](#aislamiento-multi-tenant-y-permisos)
- [Mapa de frontend y API](#mapa-de-frontend-y-api)
- [Modelo de dominio](#modelo-de-dominio)
- [Flujos operativos críticos](#flujos-operativos-críticos)
- [Desarrollo local](#desarrollo-local)
- [Variables de entorno](#variables-de-entorno)
- [Pruebas y controles](#pruebas-y-controles)
- [Despliegue](#despliegue)
- [Seguridad](#seguridad)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Versiones y roadmap](#versiones)

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
| Cobro recurrente local por Mercado Pago | **Integración preparada** | SI | NO | NO | NO | NO |
| Multi-tenant para revendedores | **SI** | NO | NO | SI | NO | NO |
| Precio de entrada | **USD 29** | ARS $59.000 | Sin publicar | USD 195+ | USD 16/usuario | USD 35/usuario |

### Lo que ninguno tiene

**Ficha pública sin login.** Todos los competidores exigen cuenta y sesión iniciada para ver los datos de un activo. En ActivaQR el operario escanea y ve la ficha en tres segundos. Y el dueño decide, activo por activo, qué se muestra y qué no.

**Catálogo de fallas en el QR.** El técnico busca el síntoma que está viendo y obtiene causas probables ordenadas por probabilidad, con la solución paso a paso. Motor diésel, cinta transportadora, aerogenerador, autoelevador y más. Ninguna solución relevada trae esto de fábrica.

**Intervención remota del soporte.** Los competidores permiten ver datos. Acá el técnico de soporte entra al sistema del cliente —con permiso aprobado por el cliente— y registra una medición, disparando el recálculo de alertas. Es tele-mantenimiento real.

**Pensado para el campo argentino.** En el pad, en el socavón o en la cámara muchas veces no hay señal: la medición queda en el celular y sube sola cuando vuelve la conexión, con la hora y la ubicación reales del momento en que se midió.

---

## Planes

| | Inicial | Empresa | Industrial |
|---|:---:|:---:|:---:|
| **Precio de referencia** | **USD 29/mes** | **USD 59/mes** | **USD 100/mes** |
| Activos incluidos | 50 | 200 | 500 |
| Activos adicionales | — | — | USD 20 cada bloque de 100 |
| Usuarios/técnicos | 3 | 10 | Ilimitados |
| Fichas QR públicas | si | si | si |
| Mediciones y mantenimientos | si | si | si |
| Alertas automáticas | si | si | si |
| Reportes PDF y CSV | si | si | si |
| Sectores e importación CSV | — | si | si |
| Soporte remoto incluido | — | si | si |
| Fichas activas con cuenta suspendida | — | si | si |
| Soporte prioritario | — | — | si |

Todos incluyen 30 días gratis sin tarjeta. Los precios canónicos se expresan en USD. Cuando Mercado Pago está configurado, el backend consulta automáticamente el dólar MEP vendedor, calcula el equivalente en ARS y mantiene actualizadas las suscripciones nuevas y existentes. Mientras se termina de habilitar esa integración, la contratación se coordina con ActivaQR. Sin costo de instalación ni permanencia mínima.

**Plan Gestionado** (a medida): servicio adicional para plantas que no tienen personal disponible para tomar las mediciones. Puede sumarse al plan de software que corresponda e incluye relevamiento presencial, carga de datos e informes. Se cotiza aparte según equipos, frecuencia, horas de campo, distancia y viáticos.

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

## Arquitectura del sistema

ActivaQR es una plataforma SaaS multi-tenant. La landing y la PWA comparten un único dominio público, pero tienen responsabilidades distintas: la landing presenta el producto; la PWA opera activos. La API es la única capa autorizada a ejecutar reglas de negocio y persistir datos.

```mermaid
flowchart TB
    subgraph campo["Campo y planta"]
        tecnico["Técnico u operador"]
        qr["Persona que escanea un QR"]
    end

    subgraph web["activaqr.net · GitHub Pages"]
        landing["Landing pública"]
        pwa["PWA React"]
        offline[("IndexedDB<br/>cola offline")]
    end

    subgraph backend["api.activaqr.net · Railway"]
        api["API Express"]
        reglas["Servicios y reglas de negocio"]
        prisma["Prisma ORM"]
    end

    db[("PostgreSQL<br/>multi-tenant")]
    externos["Mercado Pago · Stripe<br/>Resend · Web Push · Telegram"]

    tecnico --> pwa
    qr --> pwa
    landing --> api
    pwa <--> offline
    pwa -->|"HTTPS · REST · JWT"| api
    api --> reglas --> prisma --> db
    reglas <--> externos
```

### Responsabilidad de cada capa

| Capa | Responsabilidad | No debe hacer |
|---|---|---|
| Landing | Producto, planes, captación y páginas públicas | Exponer decisiones administrativas internas |
| PWA | Interacción, captura móvil, caché y cola sin conexión | Decidir el tenant o confiar en permisos visuales |
| API | Autenticación, autorización, validaciones y transacciones | Aceptar `empresaId` del cliente sin resolverlo |
| Servicios | Estados, cálculos, alertas, cotizaciones y correctivos | Escribir datos parciales fuera de una transacción |
| Prisma/PostgreSQL | Persistencia, relaciones, unicidad e índices | Mezclar datos entre empresas |
| Integraciones | Cobros, mensajes y notificaciones | Convertirse en fuente única de verdad del negocio |

### Invariantes estructurales

1. Todo dato operativo pertenece a una empresa o cuelga de una entidad que pertenece a ella.
2. El tenant de un usuario normal sale del JWT validado y de la base; nunca del formulario.
3. El superadmin no pertenece a una empresa y debe indicar explícitamente sobre cuál opera.
4. Una medición anormal puede crear una alerta, pero no autoriza una reparación.
5. Una orden correctiva sólo nace de una cotización correctiva aceptada.
6. Si la orden exige permiso de trabajo, no puede ejecutarse hasta que esté aprobado y vigente.
7. La ficha pública del QR es de solo lectura y filtra cada bloque según la visibilidad del activo.
8. Una falla de red no se interpreta como una colección vacía ni como autorización para borrar.

---

## Aislamiento multi-tenant y permisos

### Jerarquía

```mermaid
flowchart TB
    sa["Superadmin ActivaQR"]
    e1["Empresa A"]
    e2["Empresa B"]
    en["Empresa N"]
    a1["Administradores"]
    o1["Operadores"]
    activos["Sedes · sectores · activos"]

    sa --> e1
    sa --> e2
    sa --> en
    e1 --> a1
    e1 --> o1
    a1 --> activos
    o1 --> activos
```

No existe un límite estructural de empresas: el superadmin administra **N tenants**. Cada empresa tiene usuarios, ubicaciones, activos, mediciones y documentos propios.

### Resolución de una solicitud autenticada

```mermaid
flowchart TD
    req["Request con Bearer JWT"] --> firma{"¿Firma y vencimiento válidos?"}
    firma -->|No| r401["401"]
    firma -->|Sí| usuario{"¿Usuario activo y claims vigentes?"}
    usuario -->|No| revocada["401 · sesión revocada"]
    usuario -->|Sí| rol{"Rol"}
    rol -->|Superadmin| override["Exige x-empresa-id válido"]
    rol -->|Admin u operador| token["Usa empresaId del token"]
    override --> estado{"¿Empresa y trial habilitados?"}
    token --> estado
    estado -->|No| r403["403"]
    estado -->|Sí| ruta["Ruta + permiso por rol"]
```

| Capacidad | Superadmin | Admin de empresa | Operador |
|---|:---:|:---:|:---:|
| Administrar empresas y planes | Sí | No | No |
| Ver analítica global | Sí | No | No |
| Gestionar activos y configuración | Sobre tenant elegido | Sí | No |
| Cargar mediciones | Mediante acceso autorizado | Sí | Sí |
| Gestionar mantenimiento preventivo | Sobre tenant elegido | Sí | Operación asignada |
| Emitir propuesta correctiva | Sí | No | No |
| Aceptar cotización y decidir operación | No por el cliente | Sí | No |
| Aprobar permiso y conformidad | No por el cliente | Sí | No |
| Ver ficha QR pública | Sí | Sí | Sí |

---

## Mapa de frontend y API

### Frontend

```mermaid
flowchart TB
    router["App.tsx · HashRouter"] --> publica["Rutas públicas"]
    router --> auth["AuthProvider"]
    publica --> ficha["Ficha QR"]
    publica --> acceso["Aprobación remota"]
    publica --> reset["Reset de contraseña"]
    auth --> guardas["Suspensión · trial · políticas"]
    guardas --> super["Panel superadmin"]
    guardas --> tenant["Panel de empresa"]
    super --> comercial["Empresas · cotizaciones<br/>correctivos · mensajes"]
    tenant --> operacion["Dashboard · activos · mediciones<br/>mantenimiento · reportes"]
```

Las páginas se cargan con `React.lazy`. `Layout` y `Sidebar` definen la navegación autenticada; las rutas se separan por rol antes de renderizar el contenido.

### Backend

```mermaid
flowchart TB
    express["server/src/index.ts"] --> publicas["Públicas"]
    express --> auth["Auth y cuenta"]
    express --> tenant["Operación tenant"]
    express --> admin["Administración global"]
    express --> integraciones["Integraciones"]

    publicas --> pubr["landing · ficha QR<br/>fallas · testimonios"]
    auth --> authr["login · registro · políticas<br/>suscripción"]
    tenant --> tenantr["activos · mediciones · tareas<br/>sync · documentos · KPI"]
    admin --> adminr["empresas · cotizaciones<br/>correctivos · auditoría"]
    integraciones --> extr["webhooks · push<br/>email · Telegram"]
```

| Prefijo | Alcance |
|---|---|
| `/api/public/*` | Lectura pública filtrada para QR y catálogo |
| `/api/auth/*` | Registro, demo, login, perfil y recuperación |
| `/api/cuenta/*` | Estado y aceptación versionada de políticas |
| `/api/activos/*`, `/mediciones/*`, `/tareas/*` | Operación autenticada por tenant |
| `/api/sync/*` | Bootstrap y sincronización diferencial |
| `/api/cotizaciones/*`, `/correctivos/*` | Vista y decisiones del cliente |
| `/api/admin/*` | Superadmin, selección explícita de empresa |
| `/api/webhooks/*` | Confirmaciones firmadas de proveedores |

---

## Modelo de dominio

El esquema completo está en [`server/prisma/schema.prisma`](server/prisma/schema.prisma). Para mantener legibles las relaciones, el dominio se divide en tres grafos.

### Núcleo operativo

```mermaid
erDiagram
    EMPRESA ||--o{ USUARIO : contiene
    EMPRESA ||--o{ SEDE : organiza
    EMPRESA ||--o{ SECTOR : organiza
    EMPRESA ||--o{ TIPO_ACTIVO : configura
    EMPRESA ||--o{ ACTIVO : posee
    CATEGORIA_EQUIPO ||--o{ PARAMETRO_CATEGORIA : define
    CATEGORIA_EQUIPO ||--o{ FALLA_CATALOGO : documenta
    CATEGORIA_EQUIPO ||--o{ TIPO_ACTIVO : clasifica
    SEDE o|--o{ ACTIVO : ubica
    SECTOR ||--o{ ACTIVO : agrupa
    TIPO_ACTIVO ||--o{ ACTIVO : tipifica
    USUARIO o|--o{ ACTIVO : responsabiliza
    ACTIVO ||--o{ MEDICION : registra
    ACTIVO ||--o{ TAREA_MANTENIMIENTO : programa
    ACTIVO ||--o{ DOCUMENTO : adjunta
    MEDICION ||--o{ FOTO : evidencia
```

La categoría define parámetros dinámicos y fallas típicas. El tipo habilita qué magnitudes mide cada clase de equipo. El activo fija rangos propios, estrategia de mantenimiento, estado operativo, ubicación y visibilidad pública.

### Alertas y mantenimiento correctivo

```mermaid
erDiagram
    EMPRESA ||--o{ ALERTA_TECNICA : recibe
    ACTIVO ||--o{ ALERTA_TECNICA : origina
    MEDICION o|--o| ALERTA_TECNICA : dispara
    ALERTA_TECNICA o|--o| COTIZACION : propone
    COTIZACION ||--o{ COTIZACION_ENVIO : comunica
    COTIZACION ||--o{ COTIZACION_MENSAJE : conversa
    COTIZACION o|--o| ORDEN_CORRECTIVA : autoriza
    ALERTA_TECNICA o|--o| ORDEN_CORRECTIVA : resuelve
    ACTIVO ||--o{ ORDEN_CORRECTIVA : interviene
    MEDICION o|--o{ ORDEN_CORRECTIVA : verifica_cierre
```

Una alerta conserva hallazgo, riesgo, recomendación y la decisión operativa del cliente. La cotización conserva alcance e importes. La orden conserva autorización, permiso, programación, ejecución, repuestos, horas, evidencias y conformidad.

### Soporte, comercial y trazabilidad

```mermaid
erDiagram
    EMPRESA o|--o| PERMISO_ACCESO_REMOTO : habilita
    PERMISO_ACCESO_REMOTO ||--o{ MENSAJE_REMOTO : registra
    EMPRESA ||--o{ COTIZACION : recibe
    EMPRESA ||--o{ PAGO_MP : contabiliza
    USUARIO ||--o{ PUSH_SUBSCRIPTION : suscribe
    EMPRESA ||--o{ REGISTRO_AUDITORIA : traza
    LANDING ||--o{ LEAD : capta
    LANDING ||--o{ TESTIMONIO : recibe
    QR ||--o{ VISITA : registra
```

---

## Flujos operativos críticos

### 1. Medición y evaluación atómica

```mermaid
sequenceDiagram
    participant T as Técnico
    participant P as PWA
    participant A as API
    participant S as Servicio
    participant D as PostgreSQL

    T->>P: Carga valores, observación y evidencia
    P->>A: POST /api/mediciones
    A->>S: Validar tenant, activo y parámetros
    S->>D: BEGIN
    S->>D: Guardar medición
    S->>S: Evaluar umbrales
    alt normal
        S->>D: Actualizar estado operativo si corresponde
    else revisión o urgente
        S->>D: Crear alerta técnica única
        S->>D: Escalar estado del activo
    end
    S->>D: COMMIT
    A-->>P: Medición + alerta resultante
```

La medición, la alerta y la actualización del activo se confirman como una sola operación. Si falla cualquier escritura, la transacción revierte y el reintento no duplica la alerta.

### 2. Circuito correctivo

```mermaid
flowchart TD
    medicion["Medición fuera de rango"] --> alerta["Alerta técnica"]
    alerta --> decision{"Decisión operativa"}
    decision --> detener["Detener o aislar"]
    decision --> continuar["Continuar bajo responsabilidad"]
    alerta --> propuesta["Propuesta correctiva"]
    propuesta --> cotizacion["Cotización enviada"]
    cotizacion --> respuesta{"Respuesta del admin cliente"}
    respuesta -->|Rechaza| rechazada["Alerta rechazada o riesgo aceptado"]
    respuesta -->|Acepta| orden["Orden de trabajo autorizada"]
    orden --> permiso{"¿Requiere permiso?"}
    permiso -->|Sí| espera["Permiso pendiente"]
    espera --> aprobado["Permiso aprobado y vigente"]
    permiso -->|No| ejecutar["Programar y ejecutar"]
    aprobado --> ejecutar
    ejecutar --> cierre["Cierre + medición + evidencias"]
    cierre --> conformidad["Conformidad del cliente"]
```

Estados permitidos de la orden:

```mermaid
stateDiagram-v2
    [*] --> autorizada
    autorizada --> programada
    autorizada --> cancelada
    programada --> en_progreso
    programada --> cancelada
    en_progreso --> completada
    completada --> [*]
    cancelada --> [*]
```

### 3. Trabajo sin señal

```mermaid
sequenceDiagram
    participant T as Técnico
    participant P as PWA
    participant I as IndexedDB
    participant A as API

    T->>P: Registra medición sin conectividad
    P->>I: Encola operación con hora y payload
    P-->>T: Confirma guardado pendiente
    loop Hasta recuperar red
        P->>P: Escucha estado online
    end
    P->>I: Lee pendientes en orden
    P->>A: Reintenta operación autenticada
    alt aceptada
        A-->>P: 2xx
        P->>I: Elimina operación
    else error transitorio
        A-->>P: Error
        P->>I: Conserva e incrementa intentos
    end
```

La sincronización masiva es diferencial: compara el snapshot cargado con el estado actual y envía únicamente elementos modificados y `deletedIds` explícitos. Una lectura fallida nunca se transforma silenciosamente en `[]`.

### 4. Ficha pública por QR

```mermaid
flowchart LR
    scan["Escaneo"] --> ruta["/app/#/ficha/:id"]
    ruta --> api["GET /api/public/activos/:id"]
    api --> vis["Aplicar visibilidad del activo"]
    vis --> publica["Identidad y bloques permitidos"]
    vis --> oculta["Omitir parámetros sensibles"]
```

Los valores conservadores muestran identificación, ubicación general, estado y notas; ocultan por defecto parámetros, mediciones, responsable y mantenimiento.

---

## Desarrollo local

**Requisitos:** Node.js >= 18 (CI usa Node 20) y PostgreSQL.

```bash
git clone https://github.com/jesus1942/ActivaQr.git
cd ActivaQr

npm ci
npm ci --prefix server
```

Configurar el backend:

```bash
cp server/.env.example server/.env
cd server
npx prisma migrate deploy
npx prisma generate
```

Levantar la API desde `server/`:

```bash
npm run dev
```

En otra terminal, desde la raíz:

```bash
npm run dev
```

La API queda en `http://localhost:3001` y Vite en `http://localhost:5173`.

### Comandos principales

| Comando desde la raíz | Resultado |
|---|---|
| `npm run dev` | Frontend Vite |
| `npm test` | Pruebas unitarias del servidor |
| `npm run lint` | ESLint sobre TypeScript y TSX |
| `npm run build` | Build de la PWA |
| `npm run build:site` | Landing en `dist/` y aplicación en `dist/app/` |
| `npm run build --prefix server` | Compilación TypeScript del backend |
| `npm run prisma:deploy --prefix server` | Migraciones pendientes |

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
SITE_PUBLIC_URL="https://activaqr.net"
APP_PUBLIC_URL="https://activaqr.net/app/"
ALLOWED_ORIGINS="https://activaqr.net,https://www.activaqr.net"

# Mercado Pago
MP_ACCESS_TOKEN="APP_USR-..."
MP_WEBHOOK_SECRET="..."          # activa la verificación de firma
MP_BACK_URL="https://activaqr.net/app/"
# No se cargan precios fijos en ARS: se convierten desde USD al MEP automáticamente.

# Email y avisos
RESEND_API_KEY="re_..."
RESEND_FROM="ActivaQR <avisos@activaqr.net>"
LEAD_EMAIL="tu@email.com"
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_ADMIN_CHAT_ID="..."
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:avisos@activaqr.net"
```

### Frontend (`.env` o secrets de GitHub Actions)

```env
VITE_API_URL="https://api.activaqr.net"
VITE_BASE="/"                    # "/ActivaQr/" si se sirve sin dominio propio
```

La URL de la API se normaliza sola: funciona con o sin `https://`, con o sin `/api` al final.

---

## Pruebas y controles

La validación de un release debe ejecutarse sobre el mismo árbol que se va a publicar:

```mermaid
flowchart LR
    cambios["Código y migraciones"] --> lint["ESLint"]
    cambios --> tests["Pruebas unitarias"]
    cambios --> prisma["Prisma validate"]
    lint --> builds["Build frontend + backend"]
    tests --> builds
    prisma --> builds
    builds --> sitio["Build completo del sitio"]
    sitio --> release["Release candidato"]
```

```bash
npm run lint
npm test
DATABASE_URL="postgresql://usuario:password@localhost:5432/activaqr" ./server/node_modules/.bin/prisma validate --schema=server/prisma/schema.prisma
npm run build
npm run build --prefix server
npm run build:site
```

Las pruebas cubren, entre otros puntos:

- catálogo de planes y estado de suscripción;
- CORS, credenciales, URL pública y políticas;
- umbrales, alertas y mantenimiento;
- aislamiento de cotizaciones y correctivos entre empresas;
- transiciones de órdenes y permisos de trabajo;
- atomicidad de medición, alerta y estado del activo;
- estabilidad del foco en formularios modales;
- contenido público de la landing.

---

## Despliegue

Un avance de `main` dispara dos despliegues independientes desde el mismo commit:

```mermaid
flowchart TB
    main["GitHub · main"] --> pages["GitHub Actions"]
    main --> railway["Railway"]

    pages --> quality["npm ci · lint · tests<br/>build backend"]
    quality --> site["build:site"]
    site --> verify["Verificar API, landing y QR legado"]
    verify --> web["GitHub Pages<br/>activaqr.net"]

    railway --> serverBuild["Build backend"]
    serverBuild --> migrate["Bootstrap + Prisma migrate deploy"]
    migrate --> seed["Seed seguro + ensureAdmin"]
    seed --> api["API<br/>api.activaqr.net"]
```

GitHub Pages publica la landing indexable en la raíz y la PWA en `/app/`. El workflow verifica que el bundle use la API de producción, que la sección de planes exista y que los QR históricos sigan redirigiendo. Railway aplica las migraciones antes de iniciar Express y reinicia ante fallas según `server/railway.json`.

La guía completa de DNS, dominios y servicios externos está en [`docs/DEPLOY-DOMINIO.md`](docs/DEPLOY-DOMINIO.md).

---

## Seguridad

- Contraseñas con bcrypt; sin credenciales por defecto en el repositorio.
- La demo pública usa una sesión temporal de 2 horas emitida por el backend:
  no transporta ni publica una contraseña reutilizable.
- Los datasets de ejemplo generan accesos aleatorios en tiempo de ejecución y
  usan direcciones reservadas `.invalid`, sin identidades de empleados reales.
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
| Inicial | USD 29 | a calcular según el importe vigente en ARS |
| Empresa | USD 59 | a calcular según el importe vigente en ARS |
| Industrial | USD 100 | a calcular según el importe vigente en ARS |

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

## Estructura del repositorio

```mermaid
flowchart TB
    root["ActivaQr/"] --> front["src/ · frontend"]
    root --> back["server/ · backend"]
    root --> scripts["scripts/ · build"]
    root --> docs["docs/ · operación"]
    root --> public["public/ · estáticos"]
    front --> pages["pages · rutas"]
    front --> components["components · UI"]
    front --> data["data · API y offline"]
    back --> routes["src/routes · endpoints"]
    back --> services["src · servicios"]
    back --> prisma["prisma · esquema y migraciones"]
```

```text
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

### Fuentes de verdad

| Tema | Archivo o directorio |
|---|---|
| Rutas visuales y separación por rol | `src/App.tsx` |
| Clientes de API y sincronización | `src/data/` |
| Cola de operaciones offline | `src/data/offlineQueue.ts` |
| Montaje de middleware y routers | `server/src/index.ts` |
| Resolución de tenant | `server/src/tenant.ts` |
| Autenticación y roles | `server/src/auth.ts` |
| Reglas correctivas | `server/src/correctivosCore.ts` |
| Landing pública | `server/src/landing.ts` |
| Entidades y relaciones | `server/prisma/schema.prisma` |
| Historial de base de datos | `server/prisma/migrations/` |
| Catálogo comercial | `server/src/planCatalog.ts` |
| Pipeline de Pages | `.github/workflows/deploy.yml` |

---

## Versiones

**v1.3.4** — Presentación comercial interactiva exclusiva para Superadmin · 26 láminas con guion de exposición, capturas reales, grafos operativos, comparación ERP/SCADA, objeciones empresariales, simulador de retorno y piloto de 30 días · navegación responsive y modo pantalla completa.

**v1.3.3** — Landing sin información administrativa interna sobre adhesión al cobro recurrente · README técnico reestructurado con grafos de arquitectura, multi-tenancy, dominio, flujos operativos y despliegue.

**v1.3.2** — Corrección global del foco en formularios y modales · escritura continua sin desmontar el diálogo · footer público con marca Activa QR protagonista y adaptación móvil.

**v1.3.1** — Alertas técnicas originadas en mediciones gestionadas · propuestas correctivas separadas del abono · cotización y aprobación expresa del administrador · órdenes de trabajo trazables · permisos con vigencia · decisión operativa ante riesgo crítico · cierre con evidencias y conformidad del cliente.

**v1.3.0** — Módulo propio de Cotizaciones en el menú · propuestas vinculadas a empresas existentes · cálculo y vigencia persistentes · envío por plataforma, email, WhatsApp y Telegram · historial de canales · aceptación, rechazo y conversación dentro de ActivaQR.

**v1.2.0** — Precios canónicos en USD · conversión automática a ARS por dólar MEP vendedor · actualización de suscripciones nuevas y existentes · cotización y ajustes auditables · cotizador interno para Plan Gestionado.

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

Licencia propietaria — Copyright (c) 2026 Jesús Narciso Olguín. Consultá el archivo [`LICENSE`](LICENSE).
