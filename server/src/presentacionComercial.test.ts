import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = resolve(process.cwd(), '..');
const presentacion = readFileSync(resolve(RAIZ, 'src/pages/PresentacionComercial.tsx'), 'utf8');
const app = readFileSync(resolve(RAIZ, 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(RAIZ, 'src/components/layout/Sidebar.tsx'), 'utf8');

test('la presentación comercial queda disponible solo en el árbol de rutas Superadmin', () => {
  const navEmpresa = sidebar.slice(sidebar.indexOf('const navEmpresa'), sidebar.indexOf('const navSuperadmin'));
  const navSuperadmin = sidebar.slice(sidebar.indexOf('const navSuperadmin'), sidebar.indexOf('// Destinos'));

  assert.match(app, /const esSuperadmin = usuario\?\.rol === 'superadmin';/);
  assert.match(app, /\{esSuperadmin \? \([\s\S]*path="presentacion"[\s\S]*\) : \(/);
  assert.match(navSuperadmin, /to: '\/presentacion'[\s\S]*label: 'Presentación'/);
  assert.doesNotMatch(navEmpresa, /to: '\/presentacion'/);
});

test('la demostración conserva las 26 láminas y sus controles de exposición', () => {
  assert.equal((presentacion.match(/^\s{6}section:/gm) ?? []).length, 26);
  assert.match(presentacion, /Lámina \{current \+ 1\} de \{slides\.length\}/);
  assert.doesNotMatch(presentacion, />Mostrar guion</);
  assert.match(presentacion, /aria-label=\{notesOpen \? 'Ocultar notas del expositor' : 'Abrir notas del expositor'\}/);
  assert.match(presentacion, /<PanelRightOpen size=\{19\}/);
  assert.match(presentacion, /Pantalla completa/);
  assert.match(presentacion, /presentationRef\.current\?\.requestFullscreen\(\)/);
  assert.doesNotMatch(presentacion, /document\.documentElement\.requestFullscreen/);
  assert.match(presentacion, /document\.fullscreenElement === presentationRef\.current/);
  assert.match(presentacion, /RoiSimulator/);
  assert.match(presentacion, /ERP, SCADA y ActivaQR resuelven capas distintas/);
  assert.match(presentacion, /Plan de 30 días/);
  assert.doesNotMatch(presentacion, /<Badge|StatusBadge|EstadoOperativoBadge/);
});

test('las pantallas reales de la cuenta demo están incluidas y correctivos se rotula como flujo', () => {
  for (const nombre of ['dashboard', 'activo', 'medicion', 'mantenimiento', 'auditoria']) {
    const captura = resolve(RAIZ, `public/presentacion/${nombre}.jpg`);
    assert.equal(existsSync(captura), true, `falta la captura ${nombre}.jpg`);
    assert.ok(statSync(captura).size > 20_000, `la captura ${nombre}.jpg parece vacía`);
    assert.match(presentacion, new RegExp(`name="${nombre}"`));
  }

  assert.match(presentacion, /Flujo funcional · correctivos/);
  assert.doesNotMatch(presentacion, /name="correctivos"/);
});
