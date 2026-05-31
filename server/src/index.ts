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
import syncRouter from './routes/sync';

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

app.use('/api/empresas', empresasRouter);
app.use('/api/sedes', sedesRouter);
app.use('/api/sectores', sectoresRouter);
app.use('/api/tipos', tiposRouter);
app.use('/api/tecnicos', tecnicosRouter);
app.use('/api/activos', activosRouter);
app.use('/api/mediciones', medicionesRouter);
app.use('/api/tareas', tareasRouter);
app.use('/api/sync', syncRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ActivaQR API escuchando en http://localhost:${PORT}`);
});

export default app;
