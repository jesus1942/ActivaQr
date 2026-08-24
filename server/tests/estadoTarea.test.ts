import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoEfectivoTarea } from '../../src/utils/estadoTarea';

const ahora = new Date(2026, 7, 24, 12, 0, 0);

test('una tarea pendiente con fecha anterior a hoy se considera vencida', () => {
  assert.equal(estadoEfectivoTarea({ estado: 'pendiente', fechaProgramada: '2026-08-18' }, ahora), 'vencido');
});

test('una tarea programada para hoy sigue pendiente', () => {
  assert.equal(estadoEfectivoTarea({ estado: 'pendiente', fechaProgramada: '2026-08-24' }, ahora), 'pendiente');
});

test('una tarea completada nunca vuelve a vencida', () => {
  assert.equal(estadoEfectivoTarea({ estado: 'completado', fechaProgramada: '2026-08-18' }, ahora), 'completado');
});
