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
import { requireAuth } from './auth';

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

// Autenticación y administración.
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Rutas de datos: requieren usuario autenticado (cada empresa ve lo suyo).
app.use('/api/empresas', requireAuth, empresasRouter);
app.use('/api/sedes', requireAuth, sedesRouter);
app.use('/api/sectores', requireAuth, sectoresRouter);
app.use('/api/tipos', requireAuth, tiposRouter);
app.use('/api/tecnicos', requireAuth, tecnicosRouter);
app.use('/api/activos', requireAuth, activosRouter);
app.use('/api/mediciones', requireAuth, medicionesRouter);
app.use('/api/tareas', requireAuth, tareasRouter);
app.use('/api/sync', requireAuth, syncRouter);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: err?.message || 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ActivaQR API escuchando en http://localhost:${PORT}`);
});

export default app;
