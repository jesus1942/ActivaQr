import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bloquesExtra,
  multiplicadorPrecio,
  precioArsDesdeCotizacion,
  precioReferenciaUsd,
} from './planCatalog';

test('Industrial incluye 500 activos por USD 100', () => {
  assert.equal(bloquesExtra('industrial', 500), 0);
  assert.equal(precioReferenciaUsd('industrial', 500), 100);
  assert.equal(multiplicadorPrecio('industrial', 500), 1);
});

test('Industrial suma USD 20 por cada bloque o fracción de 100 activos', () => {
  assert.equal(bloquesExtra('industrial', 501), 1);
  assert.equal(precioReferenciaUsd('industrial', 600), 120);
  assert.equal(precioReferenciaUsd('industrial', 601), 140);
});

test('convierte el catálogo USD a ARS con dólar MEP y redondeo estable', () => {
  assert.equal(precioArsDesdeCotizacion('inicial', 0, 1523), 44_200);
  assert.equal(precioArsDesdeCotizacion('empresa', 0, 1523), 89_900);
  assert.equal(precioArsDesdeCotizacion('industrial', 500, 1523), 152_300);
  assert.equal(precioArsDesdeCotizacion('industrial', 501, 1523), 182_800);
});
