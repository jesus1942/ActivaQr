import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ruta = readFileSync(resolve(process.cwd(), 'src/routes/cotizaciones.ts'), 'utf8');

test('las cotizaciones separan lectura del tenant y decisiones del administrador', () => {
  assert.match(ruta, /adminCotizacionesRouter\.use\(requireAuth, requireSuperadmin\)/);
  assert.match(ruta, /clienteCotizacionesRouter\.use\(requireAuthAndActiveEmpresa\)/);
  assert.match(ruta, /get\('\/', requireConsultaDireccion/);
  assert.match(ruta, /post\('\/:id\/responder', requireAdmin/);
});

test('una respuesta sólo puede modificar cotizaciones de la empresa autenticada', () => {
  assert.match(
    ruta,
    /where: \{ id: req\.params\.id, empresaId, estado: \{ not: 'borrador' \} \}/,
  );
  assert.match(ruta, /where: \{ empresaId, estado: \{ not: 'borrador' \} \}/);
  assert.match(ruta, /registrarEnvio\(cotizacion, canal, 'preparado'\)/);
});
