import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';

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
import accesoRemotoRouter from './routes/accesoRemoto';
import categoriasRouter, { adminCategoriasRouter } from './routes/categorias';
import suscripcionRouter from './routes/suscripcion';
import { requireAuth, requireAuthAndActiveEmpresa, requireSuperadmin } from './auth';
import { seedCategorias } from './seedCategorias';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => {
  res.json({
    nombre: 'ActivaQR API',
    estado: 'ok',
    docs: 'Todas las rutas viven bajo /api',
    health: '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Webhooks externos (sin auth: los llama Mercado Pago).
app.use('/api/webhooks', webhooksRouter);

// Rutas públicas (sin auth): fichas técnicas para QR.
app.use('/api/public', publicRouter);

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
});

export default app;
