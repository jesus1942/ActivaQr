import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

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

test('ninguna pantalla declara componentes React dentro de otro componente', () => {
  const src = resolve(process.cwd(), '../src');
  const archivos: string[] = [];
  const recorrer = (directorio: string) => {
    for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
      const ruta = join(directorio, entrada.name);
      if (entrada.isDirectory()) recorrer(ruta);
      else if (entrada.name.endsWith('.tsx')) archivos.push(ruta);
    }
  };
  recorrer(src);

  const anidados: string[] = [];
  for (const archivo of archivos) {
    const fuente = ts.createSourceFile(
      archivo,
      readFileSync(archivo, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    let profundidadFuncion = 0;
    const nombreComponente = (nodo: ts.Node): string | null => {
      if (ts.isFunctionDeclaration(nodo) && nodo.name) return nodo.name.text;
      if (
        ts.isVariableDeclaration(nodo) &&
        ts.isIdentifier(nodo.name) &&
        nodo.initializer &&
        (ts.isArrowFunction(nodo.initializer) || ts.isFunctionExpression(nodo.initializer))
      ) return nodo.name.text;
      return null;
    };
    const visitar = (nodo: ts.Node) => {
      const nombre = nombreComponente(nodo);
      if (profundidadFuncion > 0 && nombre && /^[A-Z]/.test(nombre)) {
        const posicion = fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente));
        anidados.push(`${archivo}:${posicion.line + 1} ${nombre}`);
      }
      const esFuncion = ts.isFunctionLike(nodo);
      if (esFuncion) profundidadFuncion++;
      ts.forEachChild(nodo, visitar);
      if (esFuncion) profundidadFuncion--;
    };
    visitar(fuente);
  }

  assert.deepEqual(
    anidados,
    [],
    `Componentes anidados remontan inputs en cada tecla:\n${anidados.join('\n')}`,
  );
});
