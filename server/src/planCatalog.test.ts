import test from 'node:test';
import assert from 'node:assert/strict';
import { bloquesExtra, multiplicadorPrecio, precioReferenciaUsd } from './planCatalog';

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
