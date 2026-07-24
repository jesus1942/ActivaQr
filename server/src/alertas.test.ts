import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularEstadoAutomatico,
  calcularEstadoParametrosExtra,
  peorEstado,
} from './alertas';
import { validarParametrosExtra } from './routes/mediciones';

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

test('evalúa respuestas booleanas y selecciones configurables', () => {
  const estado = calcularEstadoParametrosExtra(
    {
      enciende_correctamente: false,
      estado_bateria: 'malo',
      danos_fisicos: 'severo',
    },
    [
      {
        clave: 'enciende_correctamente',
        tipo: 'booleano',
        valoresUrgente: ['false'],
      },
      {
        clave: 'estado_bateria',
        tipo: 'seleccion',
        valoresCritico: ['malo'],
      },
      {
        clave: 'danos_fisicos',
        tipo: 'seleccion',
        valoresUrgente: ['severo'],
      },
    ],
  );
  assert.equal(estado, 'urgente');
});

test('rechaza checklists incompletos o selecciones inválidas', () => {
  const parametros = [
    {
      nombre: 'Enciende correctamente',
      clave: 'enciende_correctamente',
      tipo: 'booleano',
      obligatorio: true,
      opciones: null,
    },
    {
      nombre: 'Estado de batería',
      clave: 'estado_bateria',
      tipo: 'seleccion',
      obligatorio: true,
      opciones: ['bueno', 'regular', 'malo'],
    },
  ];
  assert.match(validarParametrosExtra({}, parametros) ?? '', /obligatorio/);
  assert.match(
    validarParametrosExtra(
      { enciende_correctamente: true, estado_bateria: 'desconocido' },
      parametros,
    ) ?? '',
    /no es válida/,
  );
  assert.equal(
    validarParametrosExtra(
      { enciende_correctamente: false, estado_bateria: 'malo' },
      parametros,
    ),
    null,
  );
});
