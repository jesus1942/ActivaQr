import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generarNarracionNatural,
  INSTRUCCIONES_VOZ_RIOPLATENSE,
  NARRACION_HASHES,
} from './presentacionVoz';

const RAIZ = resolve(process.cwd(), '..');
const presentacion = readFileSync(resolve(RAIZ, 'src/pages/PresentacionComercial.tsx'), 'utf8');
const narraciones = readFileSync(resolve(RAIZ, 'src/data/presentacionNarraciones.ts'), 'utf8');
const app = readFileSync(resolve(RAIZ, 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(RAIZ, 'src/components/layout/Sidebar.tsx'), 'utf8');
const presentacionRouter = readFileSync(resolve(process.cwd(), 'src/routes/presentacion.ts'), 'utf8');
const servidor = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

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

test('la narración automática usa audio natural rioplatense y avanza cuando termina cada lámina', () => {
  const textos = [...narraciones.matchAll(/^\s{2}`([\s\S]*?)`,/gm)].map((coincidencia) => coincidencia[1]);
  assert.equal(textos.length, 26);
  assert.match(narraciones, /idioma: 'es-AR'/);
  assert.match(narraciones, /perfil: 'rioplatense-natural-v1'/);
  assert.match(narraciones, /pausaEntreLaminasMs: 1100/);
  assert.doesNotMatch(narraciones, /`Abrí |`Pedí |`Mostrá |`Preguntá /);

  assert.doesNotMatch(presentacion, /speechSynthesis|SpeechSynthesisUtterance|Voz predeterminada del dispositivo/);
  assert.match(presentacion, /descargarNarracionNatural/);
  assert.match(presentacion, /new Audio\(url\)/);
  assert.match(presentacion, /audio\.onended/);
  assert.match(presentacion, /audio\.pause\(\)/);
  assert.match(presentacion, /Voz de IA · español argentino rioplatense natural/);
  assert.match(presentacion, /No se usará la voz robótica del dispositivo/);
  assert.match(presentacion, /reproducirNarracion\(indiceInicial\)/);
  assert.match(presentacion, /go\(indice \+ 1\)/);
  assert.match(presentacion, /aria-label=\{estadoNarracion === 'paused' \? 'Reanudar narración' : 'Pausar narración'\}/);
  assert.match(presentacion, /aria-label="Detener presentación automática"/);
  assert.match(presentacion, /Texto de la narración automática/);
  assert.match(presentacion, /la lámina avanza cuando termina el comentario/);

  assert.deepEqual(
    textos.map((texto) => createHash('sha256').update(texto, 'utf8').digest('hex')),
    [...NARRACION_HASHES],
    'los hashes del servidor deben corresponder exactamente a los 26 guiones visibles',
  );
  assert.match(INSTRUCCIONES_VOZ_RIOPLATENSE, /español de Argentina/);
  assert.match(INSTRUCCIONES_VOZ_RIOPLATENSE, /acento rioplatense natural y estable/);
  assert.match(INSTRUCCIONES_VOZ_RIOPLATENSE, /No uses acento castellano de España/);
  assert.match(INSTRUCCIONES_VOZ_RIOPLATENSE, /ritmo pausado/);
  assert.match(INSTRUCCIONES_VOZ_RIOPLATENSE, /Evitá el tono robótico/);
  assert.match(presentacionRouter, /router\.use\(requireAuth, requireSuperadmin\)/);
  assert.match(presentacionRouter, /generarNarracionNatural/);
  assert.match(servidor, /app\.use\('\/api\/presentacion', presentacionRouter\)/);
});

test('el servidor genera únicamente guiones autorizados con el perfil rioplatense', async () => {
  const [primerTexto] = [...narraciones.matchAll(/^\s{2}`([\s\S]*?)`,/gm)].map((coincidencia) => coincidencia[1]);
  const fetchOriginal = globalThis.fetch;
  const keyOriginal = process.env.OPENAI_API_KEY;
  const cuerpos: Record<string, unknown>[] = [];

  process.env.OPENAI_API_KEY = 'clave-de-prueba';
  globalThis.fetch = async (_input, init) => {
    cuerpos.push(JSON.parse(String(init?.body)));
    return new Response(Buffer.alloc(2_048, 1), {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  };

  try {
    const audio = await generarNarracionNatural(0, primerTexto);
    const cuerpo = cuerpos[0];
    assert.ok(cuerpo);
    assert.equal(audio.contentType, 'audio/mpeg');
    assert.equal(audio.contenido.length, 2_048);
    assert.equal(cuerpo?.model, 'gpt-4o-mini-tts');
    assert.equal(cuerpo?.voice, 'marin');
    assert.equal(cuerpo?.input, primerTexto);
    assert.equal(cuerpo?.instructions, INSTRUCCIONES_VOZ_RIOPLATENSE);
    assert.equal(cuerpo?.response_format, 'mp3');
    await assert.rejects(() => generarNarracionNatural(0, `${primerTexto} texto agregado`), /guion autorizado/);
  } finally {
    globalThis.fetch = fetchOriginal;
    if (keyOriginal === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = keyOriginal;
  }
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
