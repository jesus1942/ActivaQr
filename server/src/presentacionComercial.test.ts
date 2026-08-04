import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const RAIZ = resolve(process.cwd(), '..');
const presentacion = readFileSync(resolve(RAIZ, 'src/pages/PresentacionComercial.tsx'), 'utf8');
const narraciones = readFileSync(resolve(RAIZ, 'src/data/presentacionNarraciones.ts'), 'utf8');
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

test('la narración automática tiene un guion hablado por lámina y avanza al terminar el audio', () => {
  assert.equal((narraciones.match(/^\s{2}`/gm) ?? []).length, 26);
  assert.match(narraciones, /idioma: 'es-AR'/);
  assert.match(narraciones, /velocidad: 0\.84/);
  assert.match(narraciones, /pausaEntreLaminasMs: 1100/);
  assert.doesNotMatch(narraciones, /`Abrí |`Pedí |`Mostrá |`Preguntá /);

  assert.match(presentacion, /crearOpcionesVoz/);
  assert.match(presentacion, /new SpeechSynthesisUtterance/);
  assert.match(presentacion, /const idioma = opcion\.voz\?\.lang \?\? opcion\.idioma/);
  assert.doesNotMatch(presentacion, /locucion\.lang = CONFIGURACION_NARRACION\.idioma/);
  assert.match(presentacion, /Voz predeterminada del dispositivo/);
  assert.match(presentacion, /opcionVozPreferidaRef/);
  assert.match(presentacion, /claveOpcionVoz/);
  assert.match(presentacion, /locucion\.onend/);
  assert.match(presentacion, /locucion\.onerror/);
  assert.match(presentacion, /Probando una alternativa…/);
  assert.match(presentacion, /Código: \$\{error\}/);
  assert.match(presentacion, /reproducirNarracion\(indiceInicial\)/);
  assert.match(presentacion, /go\(indice \+ 1\)/);
  assert.match(presentacion, /aria-label=\{estadoNarracion === 'paused' \? 'Reanudar narración' : 'Pausar narración'\}/);
  assert.match(presentacion, /aria-label="Detener presentación automática"/);
  assert.match(presentacion, /Texto de la narración automática/);
  assert.match(presentacion, /la lámina avanza cuando termina el comentario/);
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
