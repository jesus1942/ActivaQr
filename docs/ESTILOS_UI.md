# ActivaQR — Guía de estilos UI (mockup oscuro/turquesa)

> Referencia única del sistema visual. **Respetar siempre esto** al crear o tocar
> pantallas/componentes. Inspiración: mockup oscuro con turquesa, líneas
> verticales fluidas y glassmorphism.

## Dirección general
- **Tema OSCURO por defecto** (dark-first). Claro es opcional (toggle).
- Acento **turquesa/cian**. Nada de naranja ni del estilo "sketch" viejo.
- Superficies tipo **vidrio (glassmorphism)** sobre un fondo con **líneas verticales fluidas** + glow.
- Sobrio y profesional. Sin badges/píldoras: estados como texto + color/punto/línea.

## Tokens (NO hardcodear colores)
Definidos en `tailwind.config.js` + `src/index.css` (CSS vars que cambian light/dark):
- Fondos: `bg-canvas` (base), `bg-subtle`, `bg-surface` (cards), `bg-surface-2`.
- Texto: `text-content` (principal), `text-muted` (secundario), `text-faint` (terciario).
- Bordes: `border-line`, `border-line-strong`.
- **Marca (turquesa)** `brand`: 400=`#2DD4BF` (brillante), 500=`#14B8A6`, 600=`#0FB5A6`, 700=`#0D9488`. DEFAULT `#14B8A6`.
- Estados: `ok` (#10B981 verde), `warn` (#F59E0B ámbar), `danger` (#EF4444 rojo). Usar variantes `*-strong` + `dark:text-*`.
- Legacy `industrial.*` solo por compatibilidad de transición; NO usar en nuevo código.

### Reglas de color
- Acción/acento → `brand-*` (turquesa). NUNCA `orange/blue` hardcodeado.
- Estado ok/alerta/crítico → tokens `ok/warn/danger` (con `dark:` correspondiente).
- Texto → `content/muted/faint`. Bordes → `line/line-strong`.
- Elementos oscuros fijos legibles en ambos temas: `bg-slate-900 text-white` (chrome puntual: headers de tabla/modal). No usar `bg-content text-white` (se invierte en dark).

## Tipografía
- Fuentes: **Inter** (UI/body), **Manrope** (`font-display`, títulos), **JetBrains Mono** (`font-mono`).
- Títulos de página: `font-display font-bold tracking-tight`, tamaño `text-2xl sm:text-3xl`. **Sin UPPERCASE pesado** (evitar `font-black uppercase` estilo viejo).

## Botones (`src/components/ui/Button.tsx`)
- **primary**: `bg-brand-400 text-slate-900` + `shadow-glow` (halo turquesa), hover `bg-brand-300 shadow-glow-lg`.
- **secondary**: `bg-surface border border-line-strong`, hover borde/texto turquesa.
- **ghost / danger / subtle**: ver componente.
- Base con `.press` (scale al click) + `transition-all ease-premium` (líquido).

## Glassmorphism (cards / superficies)
- Patrón: `bg-surface/85 backdrop-blur-xl border border-line` (85% = punto justo, ni muy transparente).
- Sombra normal `shadow-soft`; interactivas → `hover:shadow-glow hover:-translate-y-0.5 hover:border-brand-500/40`.
- Componentes base: `Card`, `AssetCard` ya lo aplican.

## Fondo Aurora (`src/components/ui/AuroraBg.tsx`)
- **Líneas VERTICALES** (caen de arriba a abajo), fluidas, orgánicas, **no paralelas, no matriciales**.
- Columnas de glow **altas y angostas** (lectura vertical), turquesa/cian, muy difuminadas.
- Gradiente de las cintas **vertical** (x1=0 y1=0 x2=0 y2=1).
- **Parallax** suave al scroll (`#app-scroll`) + flotado infinito (`animate-aurora-1/2`).
- Va detrás de todo: `fixed inset-0 -z-10`. **El `<body>` debe ser transparente**
  (el color base va en `html`) o el aurora queda tapado. Ver `index.css`.
- Se monta en `Layout` (app) y en `Login`.

## Animaciones / transiciones
- Easing: `ease-premium` y `ease-liquid` (cubic-bezier). Duraciones suaves.
- Entre pantallas: `animate-page-in` (en el contenedor de `Outlet` del Layout, keyed por pathname).
- Fondo: `animate-aurora-1` (18s), `animate-aurora-2` (24s).
- Sombras de glow: `shadow-glow`, `shadow-glow-lg`.

## Logo
- `company-logo-hd.png` = negro (tema claro), `company-logo1.png` = blanco (tema oscuro).
- Mostrar según tema: `dark:hidden` / `hidden dark:block`.
- **Realzado** con glow turquesa: `drop-shadow-[0_0_12px_rgba(45,212,191,0.5)]` (Login usa 16px/0.55).

## Iconos PWA + miniatura
- Generados con `node generate-icons.mjs`: símbolo sobre **navy `#0B1120`** con **borde turquesa `#14B8A6`** + glow.
- `public/icons/icon-*.png`, `apple-touch-icon.png`, `favicon.png`, **`og-image.png`** (miniatura 1200×630, navy + logo + "ActivaQR" + ondas).
- `vite.config.ts` manifest: `theme_color #14B8A6`, `background_color #0B1120`.
- `index.html`: `<html class="dark">`, links de favicon/apple-touch y metas `og:*` / `twitter:*`.

## Deploy
- **Frontend (la app) → GitHub Pages**, automático al push a **`main`** (`.github/workflows/deploy.yml`). Base path `/ActivaQr/`.
- **Backend + landing + políticas → Railway** (carpeta `server/`). La **landing** (`server/src/landing.ts`) y **políticas** (`server/src/politicas.ts`) son HTML server-side: para que cambien hay que editarlas y redeployar el server (NO salen del frontend).

## Pendientes de estilo (TODO)
- Restyle de **landing** (`server/src/landing.ts`) al tema oscuro/turquesa.
- Restyle de **política de uso / privacidad / licencia** (`server/src/politicas.ts`).
- QA visual de pantallas superadmin (Analítica, Auditoría, Indicadores, Admin, Testimonios) con sesión real.
