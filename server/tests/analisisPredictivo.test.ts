import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarTendencia } from '../../src/utils/analisisPredictivo';

const fecha = (dias: number) => new Date(Date.UTC(2026, 7, 1 + dias));

test('no extrapola una tendencia mensual con solo tres lecturas en dos días', () => {
  const resultado = analizarTendencia({
    puntos: [
      { fecha: fecha(0), valor: -22 },
      { fecha: fecha(1), valor: -18 },
      { fecha: fecha(2), valor: -14 },
    ],
    alerta: -16,
    critico: -12,
    direccion: 'creciente',
    unidad: '°C',
    parametro: 'Temperatura',
  });

  assert.equal(resultado.severidad, 'alerta');
  assert.equal(resultado.prediccionDisponible, false);
  assert.equal(resultado.pendienteMensual, null);
  assert.equal(resultado.diasHastaCritico, null);
  assert.match(resultado.resumen, /3 mediciones en 2 días/);
  assert.match(resultado.recomendacion ?? '', /próximas 24 horas/);
});

test('habilita la proyección cuando hay historia suficiente y consistente', () => {
  const resultado = analizarTendencia({
    puntos: [0, 3, 6, 9, 12, 15].map((dias) => ({ fecha: fecha(dias), valor: 50 + dias })),
    alerta: 80,
    critico: 90,
    direccion: 'creciente',
    unidad: '°C',
    parametro: 'Temperatura',
  });

  assert.equal(resultado.prediccionDisponible, true);
  assert.equal(resultado.tendencia, 'subiendo');
  assert.ok(resultado.pendienteMensual != null);
  assert.equal(resultado.confianza, 'media');
});
