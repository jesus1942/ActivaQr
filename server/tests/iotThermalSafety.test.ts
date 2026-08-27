import assert from 'node:assert/strict';
import test from 'node:test';
import { detectarSaltoTemperatura } from '../src/iotIngest';

test('detecta un aumento térmico brusco sin depender de un activo asociado', () => {
  const result = detectarSaltoTemperatura({
    valorAnterior: 1,
    valorActual: 25,
    fechaAnterior: new Date('2026-08-27T16:00:00.000Z'),
    fechaActual: new Date('2026-08-27T16:05:00.000Z'),
  });
  assert.deepEqual(result, { aumento: 24, minutos: 5 });
});

test('no confunde una variación normal con un salto térmico', () => {
  const result = detectarSaltoTemperatura({
    valorAnterior: 2,
    valorActual: 4.5,
    fechaAnterior: new Date('2026-08-27T16:00:00.000Z'),
    fechaActual: new Date('2026-08-27T16:05:00.000Z'),
  });
  assert.equal(result, null);
});

test('un aumento antiguo queda fuera de la ventana de seguridad', () => {
  const result = detectarSaltoTemperatura({
    valorAnterior: 1,
    valorActual: 25,
    fechaAnterior: new Date('2026-08-27T15:00:00.000Z'),
    fechaActual: new Date('2026-08-27T16:00:00.000Z'),
  });
  assert.equal(result, null);
});
