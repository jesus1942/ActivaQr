import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rutas = readFileSync(resolve(process.cwd(), 'src/routes/correctivos.ts'), 'utf8');
const acceso = readFileSync(resolve(process.cwd(), 'src/routes/accesoRemoto.ts'), 'utf8');
const cotizaciones = readFileSync(resolve(process.cwd(), 'src/routes/cotizaciones.ts'), 'utf8');

test('superadmin y cliente usan routers separados con roles explícitos', () => {
  assert.match(rutas, /adminCorrectivosRouter\.use\(requireAuth, requireSuperadmin\)/);
  assert.match(rutas, /clienteCorrectivosRouter\.use\(requireAuthAndActiveEmpresa, requireAdmin\)/);
});

test('todas las decisiones del cliente quedan limitadas a su empresa', () => {
  assert.match(rutas, /findFirst\(\{ where: \{ id: req\.params\.id, empresaId \} \}\)/);
  assert.match(rutas, /findFirst\(\{ where: \{ id: req\.params\.id, empresaId \} \}\)/g);
  assert.match(rutas, /where: \{ empresaId \}/);
});

test('el acceso remoto no puede crear tareas correctivas directas', () => {
  assert.match(acceso, /requiere_autorizacion_correctiva/);
  assert.doesNotMatch(acceso, /prisma\.tareaMantenimiento\.create/);
});

test('medición, alerta y escalada del activo se guardan en una sola transacción', () => {
  assert.match(acceso, /prisma\.\$transaction\(async \(tx\) =>/);
  assert.match(acceso, /db: tx/);
  assert.match(acceso, /tx\.activo\.update/);
});

test('aceptar una cotización correctiva crea la orden y rechazarla no', () => {
  assert.match(cotizaciones, /accion === 'aceptar'/);
  assert.match(cotizaciones, /tx\.ordenTrabajoCorrectiva\.create/);
  assert.match(cotizaciones, /estadoPermiso: detalle\.requierePermiso \? 'pendiente' : 'no_requerido'/);
  assert.match(cotizaciones, /accion === 'rechazar'/);
  assert.match(cotizaciones, /data: \{ estado: 'rechazada' \}/);
});

test('la orden exige permiso vigente antes de programar o iniciar', () => {
  assert.match(rutas, /permisoValidoHasta\.getTime\(\) < Date\.now\(\)/);
  assert.match(rutas, /!puedeEjecutarse/);
  assert.match(rutas, /permiso de trabajo esté aprobado y vigente/);
  assert.match(rutas, /permisoValidoDesde\.getTime\(\) > Date\.now\(\)/);
  assert.match(rutas, /fecha programada debe quedar dentro de la vigencia del permiso/);
});
