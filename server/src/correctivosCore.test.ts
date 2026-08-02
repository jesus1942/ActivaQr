import test from 'node:test';
import assert from 'node:assert/strict';
import {
  armarTextoCorrectivo,
  calcularPropuestaCorrectiva,
  nivelDesdeMedicion,
  puedeEjecutarse,
  validarTransicionOrden,
} from './correctivosCore';

test('una medición anormal crea un nivel que nunca puede degradarse manualmente', () => {
  assert.equal(nivelDesdeMedicion('normal'), null);
  assert.equal(nivelDesdeMedicion('revision'), 'desmejorado');
  assert.equal(nivelDesdeMedicion('revision', 'riesgo'), 'riesgo');
  assert.equal(nivelDesdeMedicion('urgente', 'desmejorado'), 'critico');
});

test('calcula el costo correctivo y conserva la separación de conceptos', () => {
  const propuesta = calcularPropuestaCorrectiva({
    alcance: 'Cambiar rodamiento y verificar alineación.',
    manoObra: 120_000,
    repuestos: 80_000,
    traslado: 20_000,
    otros: 10_000,
    descuento: 10,
    vigenciaDias: 15,
    plazoEstimadoDias: 2,
  });
  assert.equal(propuesta.subtotal, 230_000);
  assert.equal(propuesta.descuento, 23_000);
  assert.equal(propuesta.total, 207_000);
  assert.equal(propuesta.requierePermiso, true);
});

test('rechaza propuestas sin alcance, sin costo o con valores inválidos', () => {
  assert.throws(() => calcularPropuestaCorrectiva({ manoObra: 1 }), /alcance/i);
  assert.throws(() => calcularPropuestaCorrectiva({ alcance: 'Revisar', manoObra: 0 }), /importe/i);
  assert.throws(() => calcularPropuestaCorrectiva({ alcance: 'Revisar', manoObra: 1, descuento: 101 }), /Descuento/);
});

test('una orden con permiso pendiente o rechazado no puede ejecutarse', () => {
  assert.equal(puedeEjecutarse('autorizada', 'pendiente'), false);
  assert.equal(puedeEjecutarse('programada', 'rechazado'), false);
  assert.equal(puedeEjecutarse('autorizada', 'aprobado'), true);
  assert.equal(puedeEjecutarse('autorizada', 'no_requerido'), true);
});

test('las órdenes avanzan de forma secuencial y no saltan estados', () => {
  assert.doesNotThrow(() => validarTransicionOrden('autorizada', 'programada'));
  assert.doesNotThrow(() => validarTransicionOrden('programada', 'en_progreso'));
  assert.doesNotThrow(() => validarTransicionOrden('en_progreso', 'completada'));
  assert.throws(() => validarTransicionOrden('autorizada', 'completada'), /No se puede/);
  assert.throws(() => validarTransicionOrden('completada', 'en_progreso'), /No se puede/);
});

test('la plantilla informa costo, permiso y que no existe autorización implícita', () => {
  const detalle = calcularPropuestaCorrectiva({
    alcance: 'Reemplazar componente', manoObra: 100_000, plazoEstimadoDias: 1,
  });
  const texto = armarTextoCorrectivo({
    numero: 'AQ-TEST-001', clienteNombre: 'Empresa de prueba',
    activoCodigo: 'EQ-TEST-001', activoNombre: 'Equipo de prueba',
    alertaNumero: 'AT-TEST-001', nivel: 'critico',
    hallazgo: 'Valor fuera del rango de prueba.', riesgo: 'Falla probable.',
    recomendacion: 'Aislar el equipo de prueba.', detalle,
    vigenciaHasta: new Date('2026-08-17T12:00:00Z'),
  });
  assert.match(texto, /TRABAJO CORRECTIVO/);
  assert.match(texto, /Requiere permiso de trabajo/);
  assert.match(texto, /Ninguna intervención correctiva será ejecutada/);
  assert.match(texto, /TOTAL/);
});
