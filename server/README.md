# ActivaQR — Backend (API REST)

API REST de ActivaQR construida con **Node.js + Express + Prisma + PostgreSQL** (TypeScript).
Pensada para deployar en **Railway**. Multi-empresa (multi-tenant) por header `x-empresa-id`.

## Stack

- Node.js + Express
- Prisma ORM + PostgreSQL
- TypeScript
- CORS abierto (el frontend vive en GitHub Pages, otro dominio)
- dotenv

## Desarrollo local

```bash
cd server
cp .env.example .env          # editá DATABASE_URL con tu Postgres local
npm install                   # instala deps (postinstall corre prisma generate)
npm run prisma:migrate        # crea las tablas (primera vez genera la migración)
npm run seed                  # carga datos de ejemplo
npm run dev                   # arranca en http://localhost:3001 con hot-reload
```

Health check: `GET http://localhost:3001/api/health` → `{ "status": "ok" }`

## Multi-tenant (modo demo)

Todas las rutas (salvo `/api/empresas`) aceptan la empresa activa por:

1. Header `x-empresa-id: <uuid>`
2. Query param `?empresaId=<uuid>`
3. Si no viene ninguno: **modo demo**, usa la primera empresa del seed.

## Endpoints

Base: `/api`

| Recurso        | Rutas |
| -------------- | ----- |
| `/empresas`    | GET, GET/:id, POST, PUT/:id |
| `/sedes`       | GET, GET/:id, POST, PUT/:id, DELETE/:id |
| `/sectores`    | CRUD (DELETE = soft-delete si tiene activos) |
| `/tipos`       | CRUD (DELETE = soft-delete si en uso) |
| `/tecnicos`    | CRUD (DELETE = soft-delete si en uso) |
| `/activos`     | GET (?sectorId=&tipoId=&estado=&q=), GET/:id (mediciones+tareas), POST, PUT/:id, DELETE/:id |
| `/mediciones`  | GET (?activoId=), POST (escala estado del activo), DELETE/:id |
| `/tareas`      | GET (?activoId=&estado=), POST, PUT/:id (completar), DELETE/:id |
| `/health`      | GET → `{status:'ok'}` |

## Scripts npm

| Script                   | Descripción |
| ------------------------ | ----------- |
| `npm run dev`            | Servidor con hot-reload (tsx watch) |
| `npm run build`          | Compila TypeScript a `dist/` |
| `npm run start`          | Corre `dist/index.js` (producción) |
| `npm run prisma:generate`| Genera el cliente Prisma |
| `npm run prisma:migrate` | Migración en desarrollo |
| `npm run prisma:deploy`  | Aplica migraciones en producción |
| `npm run seed`           | Carga datos de ejemplo |

---

## Deploy en Railway

### 1. Crear el proyecto

1. Entrá a [railway.app](https://railway.app) y creá un nuevo proyecto (**New Project**).

### 2. Agregar PostgreSQL

2. Dentro del proyecto: **New → Database → Add PostgreSQL**.
   Railway crea la base y expone la variable **`DATABASE_URL`** automáticamente.

### 3. Conectar este repositorio

3. **New → GitHub Repo** y seleccioná este repo.
   En la configuración del servicio, poné **Root Directory = `server`**
   (Settings → Root Directory). Así Railway solo construye el backend.

### 4. Build & Start (automático)

4. El archivo **`server/railway.json`** ya deja todo configurado. Con root `server/`,
   Railway corre:
   - **Install:** `npm install` → dispara `postinstall` (`prisma generate`).
   - **Build:** `npm run build` (compila TS a `dist/`).
   - **Start:** `npm run start:railway`, que en cada arranque:
     1. `prisma db push` → crea/sincroniza las tablas en la base de Railway.
     2. `tsx prisma/seed.ts` → siembra la empresa demo **solo si la base está vacía**
        (el seed tiene una guarda; no borra datos reales en deploys posteriores).
     3. `node dist/index.js` → levanta la API.

   No hace falta correr ningún comando a mano: el primer deploy crea las tablas y
   carga los datos de ejemplo automáticamente.

### 5. Variables de entorno

5. En **Variables** del servicio:
   - `DATABASE_URL` → la provee el plugin de PostgreSQL (referencialá con `${{Postgres.DATABASE_URL}}` si están en el mismo proyecto).
   - `PORT` → Railway la inyecta automáticamente; el servidor usa `process.env.PORT`.
   - `NODE_ENV=production` (recomendado).

### 6. URL pública y conexión con el frontend

6. En **Settings → Networking → Generate Domain** Railway te da una URL pública,
   por ejemplo: `https://activaqr-production.up.railway.app`.

   Verificá: `https://<tu-dominio>/api/health` → `{ "status": "ok" }`.

   En el **frontend** (GitHub Pages), configurá la variable de entorno de build:

   ```
   VITE_API_URL=https://<tu-dominio>/api
   ```

   (En GitHub Actions / build de Vite, definí `VITE_API_URL` con la URL de Railway terminada en `/api`.)

---

## Notas

- CORS está abierto (`origin: '*'`) por ahora. En producción conviene restringirlo al dominio del frontend.
- No hay autenticación real todavía: el aislamiento multi-tenant es por `x-empresa-id`.
- El límite de body es `10mb` para soportar fotos en base64 en las mediciones.
