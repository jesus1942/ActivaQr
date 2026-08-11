import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dialogViewport = readFileSync(
  resolve(process.cwd(), '../src/components/ui/DialogViewport.tsx'),
  'utf8',
);
const controlIndustrial = readFileSync(
  resolve(process.cwd(), '../src/pages/ControlIndustrial.tsx'),
  'utf8',
);
const controlIndustrialAdmin = readFileSync(
  resolve(process.cwd(), '../src/pages/ControlIndustrialAdmin.tsx'),
  'utf8',
);

test('los formularios conservan el foco cuando cambia su estado al escribir', () => {
  assert.match(dialogViewport, /const onEscapeRef = useRef\(onEscape\);/);
  assert.match(dialogViewport, /onEscapeRef\.current = onEscape;/);
  assert.match(dialogViewport, /onEscapeRef\.current\?\.\(\)/);
  assert.match(dialogViewport, /}, \[\]\);/);
  assert.doesNotMatch(dialogViewport, /}, \[onEscape\]\);/);
});

test('el viewport común usa el alto visual del dispositivo', () => {
  assert.match(dialogViewport, /min-h-\[100dvh\]/);
  assert.match(dialogViewport, /createPortal/);
  assert.match(dialogViewport, /document\.body/);
});

test('ActivaQR Control no crea overlays fijos fuera del portal común', () => {
  assert.match(controlIndustrial, /DialogViewport/);
  assert.match(controlIndustrialAdmin, /DialogViewport/);
  assert.doesNotMatch(controlIndustrial, /className="fixed inset-0/);
  assert.doesNotMatch(controlIndustrialAdmin, /className="fixed inset-0/);
});
