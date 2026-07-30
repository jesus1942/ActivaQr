import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderLanding } from './landing';
import { PLANES, PLAN_IDS } from './planCatalog';

const RAIZ = resolve(process.cwd(), '..');

test('la landing usa el mismo catálogo comercial que el backend', () => {
  const html = renderLanding('https://activaqr.net/app/');

  for (const plan of PLAN_IDS) {
    const config = PLANES[plan];
    assert.match(html, new RegExp(`USD ${config.precioReferenciaUsd}`));
    assert.match(html, new RegExp(`Hasta ${config.activosIncluidos} equipos`));
  }
  assert.doesNotMatch(html, /USD 20<\/span>|USD 69<\/span>|USD 179<\/span>|Hasta 10 activos|Hasta 100 activos/);
  assert.match(html, /https:\/\/api\.activaqr\.net\/politica-uso/);
  assert.match(html, /https:\/\/api\.activaqr\.net\/politica-privacidad/);
  assert.doesNotMatch(html, /demo@activaqr\.com|demo1234|Contraseña/);
});

test('la landing no promete checkout automático cuando falta configuración', () => {
  const manual = renderLanding('https://activaqr.net/app/', undefined, undefined, false);
  const automatico = renderLanding('https://activaqr.net/app/', undefined, undefined, true);

  assert.match(
    manual,
    /id="estado-contratacion"[^>]*>Podés iniciar los 30 días de prueba sin tarjeta\. La contratación se coordina con ActivaQR mientras se termina de habilitar el cobro recurrente por Mercado Pago\.<\/p>/,
  );
  assert.match(
    automatico,
    /id="estado-contratacion"[^>]*>El tenant adhiere el cobro recurrente mensual desde la app mediante Mercado Pago\.<\/p>/,
  );
});

test('las fuentes estáticas no vuelven a publicar el catálogo anterior', () => {
  const index = readFileSync(resolve(RAIZ, 'index.html'), 'utf8');
  const readme = readFileSync(resolve(RAIZ, 'README.md'), 'utf8');

  assert.match(index, /"lowPrice": "29"/);
  assert.match(index, /"highPrice": "100"/);
  assert.match(index, /Planes desde USD 29 por mes/);
  assert.doesNotMatch(index, /"lowPrice": "20"|"highPrice": "179"|Planes desde USD 20 por mes/);
  assert.match(readme, /\| Precio de entrada \| \*\*USD 29\*\*/);
  assert.doesNotMatch(readme, /\| Precio de entrada \| \*\*USD 20\*\*/);
});
