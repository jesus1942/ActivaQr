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
import tecnicosRouter from './routes/tecnicos';
import activosRouter from './routes/activos';
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
import pushRouter from './routes/push';
import auditoriaRouter from './routes/auditoria';
import kpisRouter from './routes/kpis';
import documentosRouter from './routes/documentos';
import { enviarPushASuperadmin } from './push';
import { requireAuth, requireAuthAndActiveEmpresa, requireSuperadmin } from './auth';
import { seedCategorias } from './seedCategorias';
import { seedDemo } from './seedDemo';
import { renderLanding } from './landing';
import { enviarEmailLead } from './email';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://jesus1942.github.io,https://activaqr-production.up.railway.app').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || (process.env.NODE_ENV !== 'production' && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')))) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos. Intentá en 15 minutos.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Límite global generoso contra abuso automatizado (no afecta el uso normal).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un momento.' },
});
app.use('/api/', apiLimiter);

app.use(express.json({ limit: '10mb' }));

// Landing pública en la raíz.
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'https://jesus1942.github.io/ActivaQr/';
app.get('/', (req, res) => {
  // Registrar visita a la landing (fire-and-forget, nunca demora la página).
  registrarVisita(req, 'landing').catch(() => {});
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderLanding(APP_PUBLIC_URL, process.env.WHATSAPP_NUMERO || '5492804018359'));
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Captura de leads desde la landing (sin auth).
app.post('/api/leads', async (req: Request, res: Response) => {
  const { nombre, empresa, email, telefono, mensaje } = req.body ?? {};
  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios.' });
  }
  // Siempre dejamos rastro en logs por si el email no está configurado.
  console.log('[LEAD]', JSON.stringify({ nombre, empresa, email, telefono, mensaje, fecha: new Date().toISOString() }));
  try {
    await enviarEmailLead({ nombre, empresa, email, telefono, mensaje });
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

// Rutas públicas (sin auth): fichas técnicas para QR.
app.use('/api/public', publicRouter);

// Analítica propia de visitas (sin auth: la landing y las fichas públicas la llaman).
app.use('/api/visitas', visitasRouter);

// Acceso remoto: rutas de admin van dentro de /api/admin (ver accesoRemotoRouter)
// Rutas del cliente para acceso remoto.
app.use('/api/acceso-remoto', accesoRemotoRouter);

// Autenticación y administración.
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin', accesoRemotoRouter);

// Rutas de datos: requieren token válido + empresa activa.
// requireAuthAndActiveEmpresa verifica el estado en DB en cada request —
// el bloqueo es inmediato cuando la empresa se suspende.
app.use('/api/empresas', requireAuthAndActiveEmpresa, empresasRouter);
app.use('/api/sedes', requireAuthAndActiveEmpresa, sedesRouter);
app.use('/api/sectores', requireAuthAndActiveEmpresa, sectoresRouter);
app.use('/api/tipos', requireAuthAndActiveEmpresa, tiposRouter);
app.use('/api/tecnicos', requireAuthAndActiveEmpresa, tecnicosRouter);
app.use('/api/activos', requireAuthAndActiveEmpresa, activosRouter);
app.use('/api/mediciones', requireAuthAndActiveEmpresa, medicionesRouter);
app.use('/api/tareas', requireAuthAndActiveEmpresa, tareasRouter);
app.use('/api/sync', requireAuthAndActiveEmpresa, syncRouter);
app.use('/api/categorias', requireAuthAndActiveEmpresa, categoriasRouter);
app.use('/api/suscripcion', requireAuthAndActiveEmpresa, suscripcionRouter);
app.use('/api/operadores', requireAuthAndActiveEmpresa, operadoresRouter);
app.use('/api/auditoria', requireAuthAndActiveEmpresa, auditoriaRouter);
app.use('/api/kpis', requireAuthAndActiveEmpresa, kpisRouter);
app.use('/api/documentos', requireAuthAndActiveEmpresa, documentosRouter);
// Push: la ruta public-key no requiere auth, las demás aplican requireAuth por-ruta.
app.use('/api/push', pushRouter);
app.use('/api/admin/categorias-globales', requireAuth, requireSuperadmin, adminCategoriasRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: err?.message || 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ActivaQR API escuchando en http://localhost:${PORT}`);
  // Seed global equipment categories if not already present
  seedCategorias().catch((e) => console.error('seedCategorias error:', e));
  seedDemo().catch((e) => console.error('seedDemo error:', e));
});

export default app;
