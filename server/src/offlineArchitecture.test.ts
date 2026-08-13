import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const leer = (ruta: string) => readFileSync(resolve(process.cwd(), '..', ruta), 'utf8');
const startup = leer('src/data/startup.ts');
const queue = leer('src/data/offlineQueue.ts');
const sync = leer('src/data/offlineSync.ts');
const store = leer('src/data/store.ts');
const storage = leer('src/hooks/useStorage.ts');
const layout = leer('src/components/layout/Layout.tsx');
const vite = leer('vite.config.ts');

test('el arranque offline es acotado y no espera Railway indefinidamente', () => {
  assert.doesNotMatch(startup, /while \(navigator\.onLine\)/);
  assert.match(startup, /continuamos con la copia offline/);
  assert.match(startup, /TIMEOUT_INTENTO_MS = 4_000/);
});

test('la cola offline esta aislada por tenant y usuario', () => {
  assert.match(queue, /empresaId: string/);
  assert.match(queue, /usuarioId: string/);
  assert.match(queue, /op\.empresaId === scope\.empresaId && op\.usuarioId === scope\.usuarioId/);
  assert.match(sync, /scopeOfflineActual/);
  assert.match(sync, /listarPendientes\(scope\)/);
});

test('los cambios de las colecciones base persisten y se encolan sin red', () => {
  assert.match(storage, /guardarCache\(key, value\)/);
  assert.match(storage, /cacheInicial\.current\.hubo/);
  assert.match(store, /encolarOperacion\(`sync\/\$\{entidad\}`/);
  assert.match(store, /prepararSnapshotLocal/);
  assert.match(store, /aplicarDeltasOffline/);
  assert.match(store, /res\.status === 401/);
  assert.match(store, /No se pudo leer la cola local/);
});

test('la interfaz no confunde un error de datos con una caida del servidor', () => {
  assert.doesNotMatch(layout, /Sin conexión con el servidor/);
  assert.match(layout, /No pudimos actualizar todos los datos/);
  assert.match(layout, /última copia segura/);
});

test('el shell PWA y sus rutas se precargan para abrir sin conexion', () => {
  assert.match(vite, /VitePWA/);
  assert.match(vite, /globPatterns: \['\*\*\/\*\.\{js,css,html,ico,png,svg,woff2\}'\]/);
  assert.match(vite, /start_url: base/);
  assert.match(vite, /scope: base/);
});
