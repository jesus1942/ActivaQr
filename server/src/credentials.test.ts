import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(process.cwd(), '..');
const leer = (ruta: string) => readFileSync(resolve(repoRoot, ruta), 'utf8');

test('los seeds y el frontend no incluyen contraseñas reutilizables', () => {
  const fuentes = [
    'server/prisma/seed.ts',
    'server/src/seedAustral.ts',
    'server/src/seedDemo.ts',
    'src/pages/Login.tsx',
  ].map(leer).join('\n');

  assert.doesNotMatch(fuentes, /bcrypt\.hash\(\s*['"`]/);
  assert.doesNotMatch(fuentes, /passwordInicial\s*:/);
  assert.doesNotMatch(fuentes, /\b(?:DEMO_)?PASS(?:WORD)?\b\s*=\s*['"`]/);
  assert.doesNotMatch(fuentes, /@indpatagonicas\.com/);
  assert.doesNotMatch(fuentes, /\.austral@activaqr\.net/);
});

test('el seed de despliegue no borra ni reemplaza datos de clientes', () => {
  const seed = leer('server/prisma/seed.ts');
  assert.doesNotMatch(seed, /deleteMany|delete\(|upsert\(|create\(/);
});

test('la demo usa una sesión temporal separada del login por contraseña', () => {
  const rutasAuth = leer('server/src/routes/auth.ts');
  const clienteAuth = leer('src/data/auth.ts');

  assert.match(rutasAuth, /router\.post\('\/demo'/);
  assert.match(rutasAuth, /emailNormalizado === DEMO_EMAIL/);
  assert.match(clienteAuth, /\/auth\/demo/);
});
