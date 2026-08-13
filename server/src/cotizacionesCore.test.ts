import test from 'node:test';
import assert from 'node:assert/strict';
import { armarTextoCotizacion, armarTextoCotizacionActivaControl, calcularCotizacionActivaControl, calcularCotizacionGestionada } from './cotizacionesCore';

test('calcula una cotización gestionada con visitas, traslado y descuento', () => {
  const resultado = calcularCotizacionGestionada({
    planSoftware: 'industrial',
    activos: 20,
    visitasMes: 2,
    horasVisita: 3,
    valorHora: 10_000,
    valorActivo: 500,
    kilometrosVisita: 40,
    valorKilometro: 100,
    viaticosVisita: 6_000,
    extrasMensuales: 5_000,
    descuento: 10,
    vigenciaDias: 20,
  });

  assert.equal(resultado.detalle.porVisita, 50_000);
  assert.equal(resultado.subtotal, 105_000);
  assert.equal(resultado.descuento, 10_500);
  assert.equal(resultado.total, 94_500);
  assert.equal(resultado.vigenciaDias, 20);
});

test('rechaza importes negativos y descuentos mayores a cien', () => {
  assert.throws(() => calcularCotizacionGestionada({ valorHora: -1 }), /Valor por hora/);
  assert.throws(() => calcularCotizacionGestionada({ descuento: 101 }), /Descuento/);
});

test('el texto identifica número, cliente, total y vigencia', () => {
  const calculada = calcularCotizacionGestionada({ valorHora: 10_000 });
  const texto = armarTextoCotizacion({
    numero: 'AQ-20260802-ABC123',
    clienteNombre: 'Cliente Industrial',
    concepto: calculada.concepto,
    planSoftware: calculada.planSoftware,
    detalle: calculada.detalle,
    subtotal: calculada.subtotal,
    descuento: calculada.descuento,
    total: calculada.total,
    vigenciaHasta: new Date('2026-08-17T12:00:00Z'),
  });

  assert.match(texto, /AQ-20260802-ABC123/);
  assert.match(texto, /Cliente Industrial/);
  assert.match(texto, /TOTAL MENSUAL/);
  assert.match(texto, /17\/8\/2026/);
  assert.match(texto, /No incluye mantenimiento correctivo/);
  assert.match(texto, /aprobación expresa del administrador/);
});

test('ActivaControl separa la instalación del abono recurrente por dispositivo', () => {
  const calculada = calcularCotizacionActivaControl({
    dispositivos: 4,
    costoReferenciaDispositivo: 100_000,
    precioInstaladoDispositivo: 200_000,
    abonoPorDispositivo: 12_000,
    abonoMinimoMensual: 35_000,
    vigenciaDias: 15,
  });
  assert.equal(calculada.total, 800_000);
  assert.equal(calculada.detalle.abonoMensual, 48_000);
  assert.equal(calculada.planSoftware, 'industrial');
  const texto = armarTextoCotizacionActivaControl({
    numero: 'AQ-20260813-CONTROL', clienteNombre: 'Frigorífico Sur', concepto: calculada.concepto,
    detalle: calculada.detalle, subtotal: calculada.subtotal, descuento: calculada.descuento,
    total: calculada.total, vigenciaHasta: new Date('2026-08-28T12:00:00Z'),
  });
  assert.match(texto, /TOTAL PUESTA EN MARCHA/);
  assert.match(texto, /ABONO MENSUAL/);
  assert.match(texto, /dispositivos provistos e instalados/i);
});
