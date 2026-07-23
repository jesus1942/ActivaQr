import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularEstadoAutomatico,
  calcularEstadoParametrosExtra,
  peorEstado,
} from './alertas';

test('escala una temperatura crítica', () => {
  const estado = calcularEstadoAutomatico(
    { temperatura: -10 },
    { temperaturaAlerta: -16, temperaturaCritica: -12, temperaturaMax: -8 },
  );
  assert.equal(estado, 'critico');
});

test('evalúa parámetros configurables normales e invertidos', () => {
  const alto = calcularEstadoParametrosExtra(
    { rpm: 9200 },
    [{
      clave: 'rpm', tipo: 'numerico', umbralAlerta: 7000,
      umbralCritico: 8500, umbralUrgente: 10000,
    }],
  );
  const bajo = calcularEstadoParametrosExtra(
    { nivelAceite: 8 },
    [{
      clave: 'nivelAceite', tipo: 'porcentaje', invertido: true,
      umbralAlerta: 30, umbralCritico: 15, umbralUrgente: 5,
    }],
  );
  assert.equal(alto, 'critico');
  assert.equal(bajo, 'critico');
  assert.equal(peorEstado(alto, 'urgente'), 'urgente');
});
