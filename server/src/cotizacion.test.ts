import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearArgentinaDatos, parsearDolarApi } from './cotizacionCore';

test('interpreta dólar MEP vendedor de DolarApi', () => {
  const cotizacion = parsearDolarApi({
    compra: 1518.2,
    venta: 1523.4,
    fechaActualizacion: '2026-07-29T18:00:00.000Z',
  });
  assert.equal(cotizacion.compra, 1518.2);
  assert.equal(cotizacion.venta, 1523.4);
  assert.equal(cotizacion.fuente, 'DolarApi MEP');
});

test('usa ArgentinaDatos como proveedor alternativo', () => {
  const cotizacion = parsearArgentinaDatos([
    { casa: 'bolsa', compra: 1400, venta: 1410, fecha: '2026-07-28' },
    { casa: 'oficial', compra: 900, venta: 950, fecha: '2026-07-29' },
    { casa: 'bolsa', compra: 1510, venta: 1520, fecha: '2026-07-29' },
  ]);
  assert.equal(cotizacion.venta, 1520);
  assert.equal(cotizacion.fuente, 'ArgentinaDatos MEP');
});

test('rechaza una respuesta corrupta para no cobrar un valor inventado', () => {
  assert.throws(
    () => parsearDolarApi({
      compra: 1,
      venta: 1,
      fechaActualizacion: '2026-07-29T18:00:00.000Z',
    }),
    /fuera de rango/,
  );
});
