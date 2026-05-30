import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';

import empresasRouter from './routes/empresas';
import sedesRouter from './routes/sedes';
import sectoresRouter from './routes/sectores';
import tiposRouter from './routes/tipos';
import tecnicosRouter from './routes/tecnicos';
import activosRouter from './routes/activos';
import medicionesRouter from './routes/mediciones';
import tareasRouter from './routes/tareas';

const app = express();

// CORS abierto (el frontend vive en GitHub Pages, otro dominio).
app.use(cors({ origin: '*' }));

// Límite alto para soportar fotos en base64.
app.use(express.json({ limit: '10mb' }));

// Health check.
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Rutas de la API.
app.use('/api/empresas', empresasRouter);
app.use('/api/sedes', sedesRouter);
app.use('/api/sectores', sectoresRouter);
app.use('/api/tipos', tiposRouter);
app.use('/api/tecnicos', tecnicosRouter);
app.use('/api/activos', activosRouter);
app.use('/api/mediciones', medicionesRouter);
app.use('/api/tareas', tareasRouter);

// 404 para rutas desconocidas bajo /api.
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores global.
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
