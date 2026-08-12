import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agruparEventosCamaraPorHora, normalizarEventoCamara, urlSeguraReproduccion } from './routes/camaras';

const routes = readFileSync(resolve(process.cwd(), 'src/routes/camaras.ts'), 'utf8');
const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const page = readFileSync(resolve(process.cwd(), '../src/pages/Camaras.tsx'), 'utf8');
const index = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

test('normaliza eventos Frigate de personas, zonas y segundos Unix', () => {
  const event = normalizarEventoCamara({ after: { id: 'evt-1', camera: 'entrada', label: 'person', start_time: 1786561200, score: 0.91, current_zones: ['puerta'] } });
  assert.equal(event.externalCameraId, 'entrada');
  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.type, 'persona');
  assert.equal(event.zone, 'puerta');
  assert.equal(event.confidence, 0.91);
  assert.equal(event.startedAt.getUTCFullYear(), 2026);
});

test('agrupa movimiento, personas y vehículos en 24 horas', () => {
  const now = new Date();
  const groups = agruparEventosCamaraPorHora([
    { iniciadoEn: now, tipo: 'movimiento' }, { iniciadoEn: now, tipo: 'persona' }, { iniciadoEn: now, tipo: 'vehiculo' },
  ]);
  assert.equal(groups.length, 24);
  assert.equal(groups.at(-1)?.total, 3);
  assert.equal(groups.at(-1)?.movimiento, 1);
  assert.equal(groups.at(-1)?.personas, 1);
  assert.equal(groups.at(-1)?.vehiculos, 1);
});

test('el vivo acepta HTTPS sin credenciales y rechaza RTSP o secretos embebidos', () => {
  assert.equal(urlSeguraReproduccion('https://video.example.test/cam.m3u8'), 'https://video.example.test/cam.m3u8');
  assert.throws(() => urlSeguraReproduccion('rtsp://admin:secret@192.168.1.20/live'), /HTTPS/);
  assert.throws(() => urlSeguraReproduccion('https://admin:secret@video.example.test/live'), /contraseña/);
  assert.throws(() => urlSeguraReproduccion('https://192.168.1.20/live'), /local o interna/);
  assert.throws(() => urlSeguraReproduccion('https://nvr.local/live'), /local o interna/);
  assert.throws(() => urlSeguraReproduccion('https://[::1]/live'), /IPv6/);
});

test('cámaras, eventos e integraciones están aislados por empresa', () => {
  for (const model of ['IntegracionCamara', 'Camara', 'EventoCamara']) assert.match(schema, new RegExp(`model ${model} \\{[\\s\\S]*empresaId\\s+String`));
  assert.match(routes, /function tenantId[\s\S]*req\.auth\.empresaId/);
  assert.match(routes, /findMany\(\{ where: \{ empresaId \}/);
  assert.match(routes, /findFirst\(\{ where: \{ id: req\.params\.id, empresaId \}/);
  assert.match(routes, /findFirst\(\{ where: \{ id: integracionId, empresaId \}/);
  assert.match(routes, /empresaId: integration\.empresaId/);
  assert.match(routes, /const \{ webhookTokenHash: _hash, credencialesCifradas, \.\.\.safe \} = item/);
  assert.match(routes, /webhookTokenHash: hashToken\(token\)/);
  assert.match(routes, /findUnique\(\{ where: \{ webhookTokenHash: hashToken\(req\.params\.token\) \}/);
  assert.match(index, /app\.use\('\/api\/camaras\/ingest', iotLimiter, camarasIngestRouter\)/);
});

test('la interfaz incorpora vivo, actividad por hora y conectores multimarca', () => {
  assert.match(page, /Mosaico en vivo/);
  assert.match(page, /Detecciones por hora/);
  assert.match(page, /Frigate AI Gateway/);
  assert.match(page, /ONVIF \/ RTSP multimarca/);
  assert.match(page, /setInterval\(\(\) => load\(true\), 10_000\)/);
});

test('Cámaras conserva flujos mobile-first y estados honestos sin NVR', () => {
  assert.match(page, /grid gap-4 lg:grid-cols-2 2xl:grid-cols-3/);
  assert.match(page, /aspect-video/);
  assert.match(page, /pb-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(page, /Esperando gateway de video/);
  assert.match(page, /disabled=\{!data\.integraciones\.length\}/);
  assert.doesNotMatch(page, /position:\s*fixed|className="fixed/);
});
