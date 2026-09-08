import test from 'node:test';
import assert from 'node:assert/strict';
import { permiteControlDirecto } from '../../src/utils/controlDirecto';

test('luces identificadas permiten un toque y cargas desconocidas requieren confirmación', () => {
  const device = { tipo: 'interruptor', nombre: 'Dual R3', variables: [] };
  assert.equal(permiteControlDirecto(device, { nombre: 'Luz aula', uso: 'carga' }), true);
  assert.equal(permiteControlDirecto(device, { nombre: 'Canal 1', uso: 'lampara' }), true);
  assert.equal(permiteControlDirecto(device, { nombre: 'Canal 1', uso: 'carga' }), false);
});
test('clasificación crítica prevalece sobre un nombre de luz', () => {
  const device = { tipo: 'interruptor', nombre: 'Luz', variables: [] };
  assert.equal(permiteControlDirecto(device, { nombre: 'Luz', uso: 'bomba' }), false);
  assert.equal(permiteControlDirecto({ ...device, tipo: 'sensor_ambiente' }, { nombre: 'Luz', uso: 'lampara' }), false);
  assert.equal(permiteControlDirecto({ ...device, variables: [{ clave: 'operation_mode', valorTexto: 'motor' }] }, { nombre: 'Luz' }), false);
  assert.equal(permiteControlDirecto(device, { nombre: 'Compresor', uso: 'lampara' }), false);
});
