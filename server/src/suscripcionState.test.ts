import assert from 'node:assert/strict';
import test from 'node:test';
import { cambiosEmpresaPorSuscripcion } from './suscripcionState';

test('pending no suspende ni altera la empresa', () => {
  assert.deepEqual(cambiosEmpresaPorSuscripcion('pending', 'empresa'), {});
});

test('authorized convierte el trial en cliente y aplica el plan', () => {
  assert.deepEqual(cambiosEmpresaPorSuscripcion('authorized', 'empresa'), {
    estado: 'activa',
    esTrial: false,
    trialFin: null,
    trialLecturaFin: null,
    plan: 'empresa',
    planSolicitado: null,
  });
});

test('paused y cancelled suspenden la empresa', () => {
  assert.deepEqual(cambiosEmpresaPorSuscripcion('paused'), { estado: 'suspendida' });
  assert.deepEqual(cambiosEmpresaPorSuscripcion('cancelled'), { estado: 'suspendida' });
});
