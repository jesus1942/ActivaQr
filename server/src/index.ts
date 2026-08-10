import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import empresasRouter from './routes/empresas';
import sedesRouter from './routes/sedes';
import sectoresRouter from './routes/sectores';
import tiposRouter from './routes/tipos';
import activosRouter from './routes/activos';
import ubicacionesRouter from './routes/ubicaciones';
import medicionesRouter from './routes/mediciones';
import tareasRouter from './routes/tareas';
import syncRouter from './routes/sync';
import webhooksRouter from './routes/webhooks';
import publicRouter from './routes/public';
import visitasRouter, { registrarVisita } from './routes/visitas';
import accesoRemotoRouter from './routes/accesoRemoto';
import categoriasRouter, { adminCategoriasRouter } from './routes/categorias';
import suscripcionRouter from './routes/suscripcion';
import operadoresRouter from './routes/operadores';
import tecnicosRouter from './routes/tecnicos';
import pushRouter from './routes/push';
import auditoriaRouter from './routes/auditoria';
import kpisRouter from './routes/kpis';
import documentosRouter from './routes/documentos';
import cuentaRouter from './routes/cuenta';
import testimoniosRouter, { adminTestimoniosRouter } from './routes/testimonios';
import presentacionRouter from './routes/presentacion';
import { adminCotizacionesRouter, clienteCotizacionesRouter } from './routes/cotizaciones';
import { adminCorrectivosRouter, clienteCorrectivosRouter } from './routes/correctivos';
import { enviarPushASuperadmin } from './push';
import { requireAuth, requireAuthAndActiveEmpresa, requireConsultaGestion, requireJefatura, requireSuperadmin } from './auth';
import { createOriginValidator } from './corsPolicy';
import { seedCategorias } from './seedCategorias';
import { seedFallasMotorDiesel } from './seedFallasMotorDiesel';
import { seedFallasCintaTransportadora } from './seedFallasCintaTransportadora';
import { seedFallasAerogenerador } from './seedFallasAerogenerador';
import { seedFallasAutoelevador } from './seedFallasAutoelevador';
import { limpiarEmojisDeCategorias } from './limpiarEmojis';
import { fallasRouter, fallasPublicRouter } from './routes/fallas';
import { seedDemo } from './seedDemo';
import { renderLanding } from './landing';
import { mpConfigurado } from './mercadopago';
import { renderPoliticaUso, renderPoliticaPrivacidad, POLITICAS_VERSION } from './politicas';
import { APP_PUBLIC_URL, SITE_PUBLIC_URL } from './urls';
import { enviarEmailLead } from './email';
import { prisma } from './prisma';
import { obtenerCotizacionMep } from './cotizacion';
import { iniciarSincronizadorPrecios } from './sincronizarPrecios';
import { adminControlIndustrialRouter, controlIndustrialRouter, iotIngestRouter } from './routes/controlIndustrial';
import { limpiarLecturasIoTExpiradas } from './iotIngest';
import { iniciarSincronizadorEwelink } from './ewelinkConnector';

const app = express();

// Railway pone un proxy delante: sin esto, req.ip es la IP del proxy y los
// rate limits se comparten entre todos los usuarios en vez de ser por visitante.
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", 'https://api.activaqr.net', 'https://www.google-analytics.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://activaqr.net,https://www.activaqr.net,https://jesus1942.github.io,https://activaqr-production.up.railway.app').split(',').map(s => s.trim());
const isOriginAllowed = createOriginValidator(ALLOWED_ORIGINS, process.env.NODE_ENV === 'production');
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  // Sin esto el navegador cachea el permiso CORS unos pocos segundos y
  // antepone un OPTIONS a casi cada request: el doble de viajes contra el
  // servidor. 24 h es el maximo que respetan los navegadores.
  maxAge: 86400,
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos. Intentá en 15 minutos.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/demo', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Registro de trial: límite estricto por IP contra altas masivas.
const registroLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Demasiados registros desde esta conexión. Intentá más tarde.' } });
app.use('/api/auth/registro', registroLimiter);

// Límite global generoso contra abuso automatizado (no afecta el uso normal).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
  skip: (req) => req.path.startsWith('/iot/ingest'),
});
app.use('/api/', apiLimiter);

// Endpoints públicos sin auth: acotados por IP para frenar spam de bots
// (cada lead dispara email + push; cada visita inserta en la DB).
const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15, // varias personas pueden salir por la misma IP (planta, oficina)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Ya recibimos varias solicitudes desde esta conexión. Escribinos por WhatsApp y te respondemos al toque.' },
});
const visitasLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Demasiadas solicitudes.' } });

app.use(express.json({ limit: '10mb' }));

// Landing pública en la raíz.
app.get('/', (req, res) => {
  // Registrar visita a la landing (fire-and-forget, nunca demora la página).
  registrarVisita(req, 'landing').catch(() => {});
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderLanding(APP_PUBLIC_URL, process.env.WHATSAPP_NUMERO, {
    cafecito: process.env.APOYO_CAFECITO_URL,
    mp: process.env.APOYO_MP_URL,
    stripe: process.env.APOYO_STRIPE_URL,
  }));
});

// Paginas legales publicas: requisito para aceptacion previa al pago.
app.get('/politica-uso', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPoliticaUso(APP_PUBLIC_URL));
});
app.get('/politica-privacidad', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPoliticaPrivacidad(APP_PUBLIC_URL));
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    console.error('[health] Base de datos no disponible:', error);
    res.status(503).json({ status: 'starting', database: 'unavailable' });
  }
});

// Estado público, sin exponer credenciales ni importes internos. La landing
// estática lo consulta para no prometer un checkout que aún no está habilitado.
app.get('/api/contratacion/estado', async (_req, res) => {
  if (!mpConfigurado()) {
    return res.json({ mercadoPagoHabilitado: false, cotizacion: null });
  }
  try {
    const cotizacion = await obtenerCotizacionMep();
    res.json({
      mercadoPagoHabilitado: true,
      cotizacion: {
        tipo: 'MEP',
        venta: cotizacion.venta,
        fuente: cotizacion.fuente,
        fecha: cotizacion.fechaFuente,
      },
    });
  } catch {
    res.json({ mercadoPagoHabilitado: false, cotizacion: null });
  }
});

app.get('/api/politicas/version', (_req, res) => {
  res.json({ version: POLITICAS_VERSION });
});

// Captura de leads desde la landing (sin auth).
app.post('/api/leads', leadsLimiter, async (req: Request, res: Response) => {
  const { nombre, empresa, email, telefono, mensaje, plan, atribucion } = req.body ?? {};
  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios.' });
  }
  const limpio = (valor: unknown, max: number) =>
    typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, max) : null;
  await prisma.lead.create({
    data: {
      nombre: String(nombre).trim().slice(0, 100),
      empresa: limpio(empresa, 120),
      email: String(email).trim().toLowerCase().slice(0, 160),
      telefono: limpio(telefono, 50),
      mensaje: limpio(mensaje, 2000),
      plan: limpio(plan, 30),
      source: limpio(atribucion?.source, 120),
      medium: limpio(atribucion?.medium, 120),
      campaign: limpio(atribucion?.campaign, 120),
      content: limpio(atribucion?.content, 120),
      term: limpio(atribucion?.term, 120),
    },
  });
  try {
    await enviarEmailLead({ nombre, empresa, email, telefono, mensaje, plan });
  } catch (e) {
    console.error('[LEAD] error enviando email:', e);
  }
  const waNumero = telefono ? telefono.replace(/\D/g, '') : null;
  const waUrl = waNumero
    ? `https://wa.me/${waNumero}?text=${encodeURIComponent(`Hola ${nombre}! Te contacto desde ActivaQR en respuesta a tu solicitud.`)}`
    : null;
  enviarPushASuperadmin({
    title: `Nuevo lead: ${nombre}${empresa ? ` (${empresa})` : ''}`,
    body: [email, telefono].filter(Boolean).join(' · '),
    url: waUrl ?? `mailto:${email}`,
  }).catch((e) => console.error('[LEAD] error push:', e));
  res.json({ ok: true });
});

// Webhooks externos (sin auth: los llama Mercado Pago).
app.use('/api/webhooks', webhooksRouter);
// Ingesta máquina-a-máquina. El token rotativo identifica integración y tenant.
const iotLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'La frecuencia de telemetría supera el límite contratado.' },
});
app.use('/api/iot/ingest', iotLimiter, iotIngestRouter);

// Telegram Bot webhook — responde /start con el Chat ID del usuario
app.post('/api/telegram/webhook', express.json(), async (req: Request, res: Response) => {
  try {
    const { message } = req.body ?? {};
    if (message?.text?.startsWith('/start') && message.chat?.id) {
      const chatId = String(message.chat.id);
      const nombre = message.from?.first_name ?? 'usuario';
      const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
      if (TOKEN) {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `Hola ${nombre}! Tu Chat ID es:\n\n<code>${chatId}</code>\n\nCopialo y pegalo en ActivaQR → Configuración → Telegram para activar la recuperación de contraseña.`,
            parse_mode: 'HTML',
          }),
        });
      }
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

// SEO: sitemap y robots
const SITE_URL = SITE_PUBLIC_URL;
app.get('/sitemap.xml', (_req, res) => {
  const ahora = new Date().toISOString().slice(0, 10);
  res.header('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><lastmod>${ahora}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/#features</loc><lastmod>${ahora}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/#planes</loc><lastmod>${ahora}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${SITE_URL}/#servicio</loc><lastmod>${ahora}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>${SITE_URL}/#contacto</loc><lastmod>${ahora}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>`);
});

app.get('/robots.txt', (_req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

// Rutas públicas (sin auth): fichas técnicas para QR.
app.use('/api/public', publicRouter);
// Catalogo de fallas — version publica para ficha QR (sin auth).
app.use('/api/public/fallas', fallasPublicRouter);

// Analítica propia de visitas (sin auth: la landing y las fichas públicas la llaman).
app.use('/api/visitas', visitasLimiter, visitasRouter);

// Acceso remoto: rutas de admin van dentro de /api/admin (ver accesoRemotoRouter)
// Rutas del cliente para acceso remoto.
app.use('/api/acceso-remoto', accesoRemotoRouter);

// Autenticación y administración.
app.use('/api/auth', authRouter);
app.use('/api/admin/cotizaciones', adminCotizacionesRouter);
app.use('/api/admin/correctivos', adminCorrectivosRouter);
app.use('/api/admin/control-industrial', adminControlIndustrialRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', accesoRemotoRouter);
app.use('/api/presentacion', presentacionRouter);

// Cuenta del propio tenant: solo requireAuth — accesible incluso con trial vencido.
app.use('/api/cuenta', cuentaRouter);

// Rutas de datos: requieren token válido + empresa activa.
// requireAuthAndActiveEmpresa verifica el estado en DB en cada request —
// el bloqueo es inmediato cuando la empresa se suspende.
app.use('/api/empresas', requireAuthAndActiveEmpresa, empresasRouter);
app.use('/api/sedes', requireAuthAndActiveEmpresa, sedesRouter);
app.use('/api/sectores', requireAuthAndActiveEmpresa, sectoresRouter);
app.use('/api/tipos', requireAuthAndActiveEmpresa, tiposRouter);
app.use('/api/activos', requireAuthAndActiveEmpresa, activosRouter);
app.use('/api/activos', requireAuthAndActiveEmpresa, ubicacionesRouter);
app.use('/api/mediciones', requireAuthAndActiveEmpresa, medicionesRouter);
app.use('/api/tareas', requireAuthAndActiveEmpresa, tareasRouter);
app.use('/api/sync', requireAuthAndActiveEmpresa, requireJefatura, syncRouter);
app.use('/api/categorias', requireAuthAndActiveEmpresa, categoriasRouter);
// Suscripción queda accesible aun con el trial vencido para permitir contratar.
app.use('/api/suscripcion', requireAuth, suscripcionRouter);
app.use('/api/cotizaciones', clienteCotizacionesRouter);
app.use('/api/correctivos', clienteCorrectivosRouter);
app.use('/api/operadores', requireAuthAndActiveEmpresa, operadoresRouter);
app.use('/api/tecnicos', requireAuthAndActiveEmpresa, tecnicosRouter);
app.use('/api/fallas', requireAuthAndActiveEmpresa, fallasRouter);
app.use('/api/auditoria', requireAuthAndActiveEmpresa, requireConsultaGestion, auditoriaRouter);
app.use('/api/kpis', requireAuthAndActiveEmpresa, requireConsultaGestion, kpisRouter);
app.use('/api/documentos', requireAuthAndActiveEmpresa, documentosRouter);
app.use('/api/control-industrial', requireAuthAndActiveEmpresa, controlIndustrialRouter);
// Push: la ruta public-key no requiere auth, las demás aplican requireAuth por-ruta.
app.use('/api/push', pushRouter);
app.use('/api/admin/categorias-globales', requireAuth, requireSuperadmin, adminCategoriasRouter);
app.use('/api/testimonios', testimoniosRouter);
app.use('/api/admin/testimonios', requireAuth, requireSuperadmin, adminTestimoniosRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[ERROR]', new Date().toISOString(), err?.message, isProd ? '' : err?.stack);
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  const message = isProd ? 'Error interno del servidor' : (err?.message || 'Error interno del servidor');
  res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ActivaQR API escuchando en http://localhost:${PORT}`);
  iniciarSincronizadorPrecios();
  // Seed global equipment categories if not already present.
  // Cada paso es independiente: si uno falla, los demas siguen.
  seedCategorias()
    .then(() => limpiarEmojisDeCategorias())
    .then(() => seedFallasMotorDiesel())
    .then(() => seedFallasCintaTransportadora())
    .then(() => seedFallasAerogenerador())
    .then(() => seedFallasAutoelevador())
    .catch((e) => console.error('seed/limpieza error:', e));
  seedDemo().catch((e) => console.error('seedDemo error:', e));
  limpiarLecturasIoTExpiradas().then((count) => count && console.log(`[iot] ${count} lecturas vencidas eliminadas.`)).catch((e) => console.error('[iot] limpieza inicial:', e));
  setInterval(() => limpiarLecturasIoTExpiradas().catch((e) => console.error('[iot] limpieza programada:', e)), 24 * 60 * 60 * 1000).unref();
  iniciarSincronizadorEwelink();
});

export default app;
