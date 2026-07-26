# Puesta en marcha del dominio propio — activaqr.net

Arquitectura final (misma que hoy, pero con dominio propio):

```
activaqr.net          →  Frontend (GitHub Pages, gratis, HTTPS automático)
www.activaqr.net      →  Redirige al anterior
api.activaqr.net      →  API + PostgreSQL (Railway, donde ya corre)
```

El código ya quedó preparado: el frontend se compila con base configurable
(`VITE_BASE`), el service worker y el 404 detectan la base solos, y el
servidor acepta los orígenes nuevos por defecto.

---

## 1. DNS en Namecheap

Panel de Namecheap → Domain List → `activaqr.net` → **Advanced DNS**
(o el panel de PremiumDNS si está activo). Cargar estos registros:

| Tipo  | Host | Valor                  | Para qué |
|-------|------|------------------------|----------|
| A     | `@`  | `185.199.108.153`      | GitHub Pages |
| A     | `@`  | `185.199.109.153`      | GitHub Pages |
| A     | `@`  | `185.199.110.153`      | GitHub Pages |
| A     | `@`  | `185.199.111.153`      | GitHub Pages |
| CNAME | `www`| `jesus1942.github.io`  | GitHub Pages (www) |
| CNAME | `api`| *(el valor que muestra Railway, paso 3)* | API |

Borrar los registros que Namecheap crea por defecto (parking page /
URL redirect) para `@` y `www`.

## 2. Dominio en GitHub Pages

Repo `jesus1942/ActivaQr` → **Settings → Pages**:

1. En **Custom domain** escribir `activaqr.net` y guardar.
2. Esperar a que valide el DNS (minutos u horas, según propagación).
3. Tildar **Enforce HTTPS** cuando se habilite (GitHub emite el certificado
   solo — el SSL comprado en Namecheap NO se usa acá).

Las URLs viejas `jesus1942.github.io/ActivaQr/...` redirigen solas al
dominio nuevo y el hash (`#/ficha/...`) se conserva, así que **los QR ya
impresos siguen funcionando**.

## 3. Dominio en Railway

Panel de Railway → servicio de la API → **Settings → Networking →
Custom Domain** → agregar `api.activaqr.net`. Railway muestra el valor
CNAME a cargar en Namecheap (paso 1). El certificado HTTPS lo emite
Railway automáticamente.

## 4. Variables de entorno

**En GitHub** (repo → Settings → Secrets and variables → Actions):

- `VITE_API_URL` = `https://api.activaqr.net`

**En Railway** (servicio de la API → Variables) — los defaults del código
ya apuntan al dominio nuevo, pero si estas variables existen deben
actualizarse:

- `ALLOWED_ORIGINS` = `https://activaqr.net,https://www.activaqr.net`
- `APP_PUBLIC_URL` = `https://activaqr.net/`
- `APP_URL` = `https://activaqr.net`
- `MP_BACK_URL` = `https://activaqr.net/`

## 5. Servicios externos

- **Mercado Pago**: en el panel de desarrolladores, actualizar la URL de
  webhooks/notificaciones a `https://api.activaqr.net/...` (misma ruta que
  la actual, solo cambia el host).
- **Resend**: verificar el dominio `activaqr.net` (Resend indica los
  registros TXT/DKIM a cargar en Namecheap) para poder enviar emails desde
  `@activaqr.net` con buena entregabilidad.

## 6. Orden recomendado

1. Cargar DNS (paso 1) y dominios en GitHub Pages y Railway (pasos 2 y 3).
2. Configurar variables (paso 4).
3. Mergear esta rama a `main` → el deploy publica el frontend con base `/`.
4. Actualizar Mercado Pago y Resend (paso 5).
5. Probar: landing, login, ficha pública por QR, push, y un pago de prueba.

## Nota sobre la compra en Namecheap

- El **Standard SSL** comprado no hace falta: GitHub Pages y Railway emiten
  certificados gratis. Se puede pedir reembolso si no se activó.
- Los trials de **Private Email** y **Relate SEO** se renuevan con cargo:
  desactivar auto-renew si no se van a usar.
- **PremiumDNS** es opcional; el DNS estándar de Namecheap alcanza.
