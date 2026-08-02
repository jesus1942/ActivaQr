import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APP_PUBLIC_URL,
  APP_URL,
  MP_BACK_URL,
  SITE_PUBLIC_URL,
} from './urls';

test('separa la landing pública de la aplicación', () => {
  assert.equal(SITE_PUBLIC_URL, 'https://activaqr.net');
  assert.equal(APP_PUBLIC_URL, 'https://activaqr.net/app/');
  assert.equal(APP_URL, 'https://activaqr.net/app');
  assert.equal(MP_BACK_URL, 'https://activaqr.net/app/');
});
