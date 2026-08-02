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
