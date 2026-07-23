import test from 'node:test';
import assert from 'node:assert/strict';
import { createOriginValidator } from './corsPolicy';

test('acepta sólo orígenes exactos en producción', () => {
  const allowed = createOriginValidator(['https://jesus1942.github.io'], true);
  assert.equal(allowed('https://jesus1942.github.io'), true);
  assert.equal(allowed('https://jesus1942.github.io.evil.example'), false);
  assert.equal(allowed('https://jesus1942.github.io:444'), false);
  assert.equal(allowed(undefined), true);
});

test('localhost sólo se acepta fuera de producción', () => {
  assert.equal(createOriginValidator([], false)('http://localhost:5173'), true);
  assert.equal(createOriginValidator([], true)('http://localhost:5173'), false);
});
