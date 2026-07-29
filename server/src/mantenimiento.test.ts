import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estrategiaValida,
  mantenimientoVencido,
  siguienteLectura,
  sumarIntervaloCalendario,
  unidadMantenimientoValida,
} from './mantenimiento';

test('normaliza estrategias y unidades de mantenimiento', () => {
  assert.equal(estrategiaValida('kilometros'), 'kilometros');
  assert.equal(estrategiaValida('otra'), 'fecha');
  assert.equal(unidadMantenimientoValida('horas', 'meses'), 'horas');
  assert.equal(unidadMantenimientoValida('fecha', 'semanas'), 'semanas');
});

test('calcula el próximo umbral por uso', () => {
  assert.equal(siguienteLectura(12_450, 10_000), 22_450);
});

test('calcula intervalos calendario sin aproximar meses a 30 días', () => {
  assert.equal(
    sumarIntervaloCalendario(new Date('2026-01-15T00:00:00Z'), 2, 'meses').toISOString(),
    '2026-03-15T00:00:00.000Z',
  );
  assert.equal(
    sumarIntervaloCalendario(new Date('2026-01-15T00:00:00Z'), 2, 'semanas').toISOString(),
    '2026-01-29T00:00:00.000Z',
  );
  assert.equal(
    sumarIntervaloCalendario(new Date('2026-01-31T00:00:00Z'), 1, 'meses').toISOString(),
    '2026-02-28T00:00:00.000Z',
  );
  assert.equal(
    sumarIntervaloCalendario(new Date('2028-01-31T00:00:00Z'), 1, 'meses').toISOString(),
    '2028-02-29T00:00:00.000Z',
  );
});

test('detecta vencimiento por horas, kilómetros o fecha', () => {
  const base = {
    horasActuales: 500,
    kilometrosActuales: 15_000,
    proximoMantenimientoLectura: 500,
    proximoMantenimiento: new Date('2026-07-01T00:00:00Z'),
  };
  assert.equal(mantenimientoVencido({ ...base, estrategiaMantenimiento: 'horas' }), true);
  assert.equal(mantenimientoVencido({ ...base, estrategiaMantenimiento: 'kilometros' }), true);
  assert.equal(
    mantenimientoVencido({ ...base, estrategiaMantenimiento: 'fecha' }, new Date('2026-07-29T00:00:00Z')),
    true,
  );
});
