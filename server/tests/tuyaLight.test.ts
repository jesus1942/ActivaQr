import test from 'node:test';
import assert from 'node:assert/strict';
import { comandosLuzTuya } from '../src/tuyaLight';

test('RGB v2 selecciona colour y conserva las escalas HSV', () => {
  assert.deepEqual(comandosLuzTuya({ accion: 'color', h: 120, s: 1000, v: 500 }), [{ code: 'work_mode', value: 'colour' }, { code: 'colour_data_v2', value: '{"h":120,"s":1000,"v":500}' }]);
});
test('iluminación utiliza switch_led y temporizador en segundos', () => {
  assert.deepEqual(comandosLuzTuya({ accion: 'encendido', encendido: false }), [{ code: 'switch_led', value: false }]);
  assert.deepEqual(comandosLuzTuya({ accion: 'temporizador', segundos: 86400 }), [{ code: 'countdown_1', value: 86400 }]);
});
test('rechaza órdenes arbitrarias, valores fuera de rango y coerción', () => {
  for (const payload of [{ accion: 'raw' }, { accion: 'color', h: 361, s: 1000, v: 500 }, { accion: 'blanco', brillo: 0, temperatura: 500 }, { accion: 'temporizador', segundos: '60' }, { accion: 'encendido', encendido: 'false' }]) assert.throws(() => comandosLuzTuya(payload));
});
