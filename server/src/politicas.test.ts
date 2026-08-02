import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POLITICAS_VERSION,
  renderPoliticaPrivacidad,
  renderPoliticaUso,
} from './politicas';

test('las políticas publican el domicilio y la jurisdicción correctos', () => {
  const uso = renderPoliticaUso('https://activaqr.net/app/');
  const privacidad = renderPoliticaPrivacidad('https://activaqr.net/app/');

  assert.equal(POLITICAS_VERSION, '2026-07-30');
  assert.match(uso, /Puerto Madryn/);
  assert.match(uso, /Provincia del Chubut/);
  assert.match(privacidad, /Puerto Madryn/);
  assert.match(privacidad, /Provincia del Chubut/);
  assert.match(uso, /https:\/\/activaqr\.net\/#contacto/);
  assert.match(privacidad, /https:\/\/activaqr\.net\/#contacto/);
});
