import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dialogViewport = readFileSync(
  resolve(process.cwd(), '../src/components/ui/DialogViewport.tsx'),
  'utf8',
);

test('los formularios conservan el foco cuando cambia su estado al escribir', () => {
  assert.match(dialogViewport, /const onEscapeRef = useRef\(onEscape\);/);
  assert.match(dialogViewport, /onEscapeRef\.current = onEscape;/);
  assert.match(dialogViewport, /onEscapeRef\.current\?\.\(\)/);
  assert.match(dialogViewport, /}, \[\]\);/);
  assert.doesNotMatch(dialogViewport, /}, \[onEscape\]\);/);
});
