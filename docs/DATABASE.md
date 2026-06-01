# ActivaQR — Diseño de Base de Datos

> Documento de arquitectura. Define el modelo de datos para el backend en Railway (PostgreSQL).
> Decisiones tomadas: **multi-empresa**, **Sectores/Tipos/Técnicos como entidades editables (CRUD)**.

---

## Visión general

ActivaQR pasa de un prototipo con `localStorage` a un producto real con:

- **Backend:** Node.js + Express + Prisma ORM
- **Base de datos:** PostgreSQL (en Railway)
- **Frontend:** React (en GitHub Pages) que consume la API por HTTPS
- **Multi-empresa:** una sola instalación sirve a varios clientes (cada empresa ve solo sus datos)

```
┌─────────────────┐      HTTPS/JSON      ┌──────────────────┐      ┌──────────────┐
│  Frontend React │ ──────────────────▶  │  API Express     │ ───▶ │  PostgreSQL  │
│  (GitHub Pages) │ ◀──────────────────  │  (Railway)       │ ◀─── │  (Railway)   │
└─────────────────┘                       └──────────────────┘      └──────────────┘
```

---

## Entidades

### 1. Empresa
La organización cliente. Todo cuelga de acá (multi-tenant).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| nombre | string | Razón social |
| cuit | string? | Identificación fiscal |
| logoUrl | string? | Logo propio de la empresa |
| plan | enum | `inicial` \| `empresa` \| `industrial` |
| creadaEn | datetime | |

### 2. Sede
Ubicación física de una empresa (planta, depósito, sucursal).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| empresaId | uuid (FK → Empresa) | |
| nombre | string | Ej: "Planta Madryn" |
| direccion | string? | |
| ciudad | string? | Puerto Madryn, Rawson, Comodoro… |

### 3. Sector ✅ CRUD
Antes hardcodeado. Ahora entidad editable por empresa.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| empresaId | uuid (FK → Empresa) | |
| nombre | string | Ej: "Planta", "Taller", "Frigorífico" |
| color | string? | Color para badges/UI |
| activo | boolean | Soft-delete (no borrar si tiene activos) |

### 4. TipoActivo ✅ CRUD
Antes enum fijo. Ahora entidad editable, con campos que definen qué se mide.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| empresaId | uuid (FK → Empresa) | |
| nombre | string | Ej: "Motor", "Compresor", "Cámara de frío" |
| icono | string? | Nombre de ícono lucide |
| mideTemperatura | boolean | Define qué campos aparecen al medir |
| mideAmperaje | boolean | |
| midePresion | boolean | |
| mideVibracion | boolean | |
| activo | boolean | Soft-delete |

### 5. Tecnico ✅ CRUD
Antes texto libre. Ahora personas reales (responsables / operarios).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| empresaId | uuid (FK → Empresa) | |
| nombre | string | |
| rol | enum | `admin` \| `supervisor` \| `tecnico` |
| email | string? | |
| telefono | string? | |
| activo | boolean | |

### 6. Activo
El equipo. Ahora referencia a Sector, TipoActivo, Tecnico y Sede por FK.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| empresaId | uuid (FK → Empresa) | |
| sedeId | uuid (FK → Sede)? | |
| sectorId | uuid (FK → Sector) | ← antes string |
| tipoId | uuid (FK → TipoActivo) | ← antes enum |
| responsableId | uuid (FK → Tecnico)? | ← antes string |
| codigo | string | Único por empresa. Ej: "HOR-MOT-001" |
| nombre | string | |
| marca | string? | |
| modelo | string? | |
| fechaIngreso | date | |
| ubicacion | string? | |
| horasActuales | int | |
| estado | enum | `normal` \| `alerta` \| `critico` \| `mantenimiento` |
| temperaturaMin | float? | |
| temperaturaMax | float? | |
| temperaturaAlerta | float? | |
| temperaturaCritica | float? | |
| amperajeNormal | float? | |
| presionNormal | float? | |
| intervaloMedicionHoras | int? | |
| intervaloLubricacionHoras | int? | |
| intervaloRodamientoHoras | int? | |
| proximoMantenimiento | date? | |
| notas | string? | |
| creadoEn | datetime | |
| actualizadoEn | datetime | |

### 7. Medicion
Lectura tomada en campo (o importada).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| activoId | uuid (FK → Activo) | |
| tecnicoId | uuid (FK → Tecnico)? | ← antes string |
| fecha | datetime | |
| temperatura | float? | |
| amperaje | float? | |
| presion | float? | |
| vibracion | enum | `ninguna` \| `leve` \| `moderada` \| `alta` |
| horasMarcha | int? | |
| estado | enum | `normal` \| `revision` \| `urgente` |
| observaciones | string? | |
| origen | enum | `manual` \| `csv` \| `api` |

### 8. Foto (mediciones)
Evidencia fotográfica de una medición.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| medicionId | uuid (FK → Medicion) | |
| url | string | Storage externo o base64 inicial |

### 9. TareaMantenimiento
Tarea programada o realizada.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | |
| activoId | uuid (FK → Activo) | |
| responsableId | uuid (FK → Tecnico)? | |
| tipo | string | "Lubricación", "Cambio rodamiento"… |
| fechaProgramada | date | |
| fechaRealizada | date? | |
| estado | enum | `pendiente` \| `completado` \| `vencido` |
| observaciones | string? | |

---

## Relaciones (resumen)

```
Empresa 1───∞ Sede
Empresa 1───∞ Sector
Empresa 1───∞ TipoActivo
Empresa 1───∞ Tecnico
Empresa 1───∞ Activo

Activo  ∞───1 Sector
Activo  ∞───1 TipoActivo
Activo  ∞───1 Tecnico (responsable)
Activo  ∞───1 Sede

Activo  1───∞ Medicion
Activo  1───∞ TareaMantenimiento
Medicion 1──∞ Foto
Medicion ∞──1 Tecnico
```

---

## Reglas de negocio clave

1. **Soft-delete en catálogos:** Sector, TipoActivo y Tecnico no se borran si tienen activos/mediciones asociados — se marcan `activo=false`. Evita romper el historial.
2. **Código único por empresa:** dos empresas pueden tener "MOT-001"; dentro de una no.
3. **Aislamiento multi-tenant:** toda query filtra por `empresaId` del usuario autenticado.
4. **Tipo define el formulario:** los flags `mide*` del TipoActivo determinan qué campos se muestran al cargar una medición.
5. **Escalado automático de estado:** una medición `urgente` pasa el activo a `critico`; `revision` lo pasa a `alerta` si estaba `normal`.
6. **Alerta de tendencia:** 3 mediciones consecutivas con temperatura creciente → marca tendencia anormal.

---

## API REST (endpoints previstos)

```
# Catálogos (CRUD completo)
GET/POST/PUT/DELETE   /api/sectores
GET/POST/PUT/DELETE   /api/tipos
GET/POST/PUT/DELETE   /api/tecnicos
GET/POST/PUT/DELETE   /api/sedes

# Activos (CRUD completo)
GET    /api/activos            ?sector=&tipo=&estado=&q=
POST   /api/activos
GET    /api/activos/:id
PUT    /api/activos/:id
DELETE /api/activos/:id

# Mediciones
GET    /api/activos/:id/mediciones
POST   /api/mediciones
DELETE /api/mediciones/:id

# Mantenimiento
GET    /api/tareas
POST   /api/tareas
PUT    /api/tareas/:id
DELETE /api/tareas/:id

# Importación / Reportes
POST   /api/importar           (CSV)
GET    /api/reportes           (datos para PDF)
```

---

## Etapas de migración

| Etapa | Qué | Estado |
|---|---|---|
| 1 | Diseño del esquema (este documento) | ✅ |
| 2 | Backend Express + Prisma + Postgres | 🔜 |
| 3 | Deploy en Railway | 🔜 |
| 4 | CRUD completo en frontend (Sector/Tipo/Técnico/Activo) | 🔜 |
| 5 | Conectar frontend a la API (reemplazar localStorage) | 🔜 |
| 6 | Login y aislamiento por empresa | 🔜 |

---

*Última actualización: planificación inicial multi-empresa.*
