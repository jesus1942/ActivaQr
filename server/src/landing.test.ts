import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderLanding } from './landing';
import { ENTRADAS_BITACORA, renderBitacora } from './bitacora';
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
  assert.doesNotMatch(html, /contraseña|password/i);
});

test('la landing muestra solo la información comercial necesaria sobre el cobro', () => {
  const html = renderLanding('https://activaqr.net/app/');

  assert.doesNotMatch(html, /El tenant adhiere el cobro recurrente desde la app/);
  assert.doesNotMatch(html, /id="estado-contratacion"|actualizarEstadoContratacion/);
  assert.match(html, /Los planes se expresan en USD/);
  assert.match(html, /Mercado Pago cobra en ARS al dólar MEP vendedor vigente/);
  assert.match(html, /el equivalente se actualiza automáticamente/);
});

test('el Plan Gestionado se cotiza aparte y llega identificado por el formulario', () => {
  const html = renderLanding('https://activaqr.net/app/');

  assert.match(html, /Plan Gestionado · Cotización personalizada/);
  assert.match(html, /La suscripción de ActivaQR se factura por separado/);
  assert.match(html, /data-plan-contacto="gestionado"/);
  assert.match(html, /id="leadPlan" name="plan" type="hidden"/);
  assert.doesNotMatch(html, /tu-correo-privado@ejemplo\.com|LEAD_EMAIL/);
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

test('el contacto de WhatsApp se configura por entorno y no queda publicado en el servidor', () => {
  const servidor = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

  assert.match(servidor, /process\.env\.WHATSAPP_NUMERO/);
  assert.doesNotMatch(servidor, /WHATSAPP_NUMERO\s*\|\|\s*['"]\d{8,}['"]/);
});

test('la landing abre una bitácora pública con avances verificables', () => {
  const landing = renderLanding('https://activaqr.net/app/');
  const bitacora = renderBitacora('https://activaqr.net/app/');

  assert.match(landing, /href="\/bitacora\/"/);
  assert.match(landing, /Estamos marcando una nueva frontera/);
  assert.match(bitacora, /Prueba real superada: ActivaQR ya conversa con eWeLink/);
  assert.match(bitacora, /Estados actualizados cada 5 segundos/);
  assert.match(bitacora, /Exportación CSV por dispositivo o canal/);
  assert.match(bitacora, /<link rel="canonical" href="https:\/\/activaqr\.net\/bitacora\/"/);
  assert.match(bitacora, /@media\(max-width:640px\)/);
  assert.match(bitacora, /\.entrada\{grid-template-columns:1fr/);
  assert.match(landing, /@media\(max-width:820px\).*\.bitacora-preview-grid\{grid-template-columns:1fr\}/);
  assert.equal(ENTRADAS_BITACORA[0].version, 'MULTIMARCA');
  assert.match(bitacora, /Tuya \/ Smart Life Cloud por tenant/);
  assert.match(bitacora, /Corriente, voltaje, potencia y consumo por canal/);
});
