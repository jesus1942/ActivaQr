import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizarEventoIoT } from './iotIngest';
import { cifrarCredenciales, descifrarCredenciales, firmarEstadoOAuth, hashToken, verificarEstadoOAuth } from './iotSecrets';

const ROOT = resolve(process.cwd(), '..');
const routes = readFileSync(resolve(process.cwd(), 'src/routes/controlIndustrial.ts'), 'utf8');
const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const app = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');
const sidebar = readFileSync(resolve(ROOT, 'src/components/layout/Sidebar.tsx'), 'utf8');
const controlIndustrial = readFileSync(resolve(ROOT, 'src/pages/ControlIndustrial.tsx'), 'utf8');
const main = readFileSync(resolve(ROOT, 'src/main.tsx'), 'utf8');

test('normaliza eventos HTTPS del UG65 con devEUI y objeto decodificado', () => {
  const event = normalizarEventoIoT({
    devEUI: '24E124725E123456',
    deviceName: 'Cámara 1',
    timestamp: '2026-08-10T13:00:00.000Z',
    object: { temperature: -21.4, door: false, battery: 92 },
    rssi: -73,
  });
  assert.equal(event.dispositivoExternoId, '24E124725E123456');
  assert.equal(event.lecturas.temperature, -21.4);
  assert.equal(event.lecturas.door, false);
  assert.equal(event.bateria, 92);
  assert.equal(event.rssi, -73);
});
test('rechaza eventos sin identidad o sin variables decodificadas', () => {
  assert.throws(() => normalizarEventoIoT({ object: { temperature: 2 } }), /devEUI o deviceId/);
  assert.throws(() => normalizarEventoIoT({ devEUI: 'abc', data: { nested: { value: 1 } } }), /lecturas decodificadas/);
});

test('cifra secretos con autenticación y nunca conserva el texto plano', () => {
  const original = process.env.IOT_CREDENTIALS_KEY;
  process.env.IOT_CREDENTIALS_KEY = 'clave-de-prueba-larga-y-unica';
  try {
    const encrypted = cifrarCredenciales({ appId: 'app-1', accessToken: 'secreto-total' });
    assert.match(encrypted, /^v1\./);
    assert.doesNotMatch(encrypted, /secreto-total/);
    assert.deepEqual(descifrarCredenciales(encrypted), { appId: 'app-1', accessToken: 'secreto-total' });
    assert.notEqual(hashToken('token-a'), hashToken('token-b'));
  } finally {
    if (original === undefined) delete process.env.IOT_CREDENTIALS_KEY;
    else process.env.IOT_CREDENTIALS_KEY = original;
  }
});

test('firma el estado OAuth y rechaza alteraciones o vencimientos', () => {
  const original = process.env.IOT_CREDENTIALS_KEY;
  process.env.IOT_CREDENTIALS_KEY = 'clave-de-prueba-larga-y-unica';
  try {
    const state = firmarEstadoOAuth({ integrationId: 'iot-1', empresaId: 'empresa-1', userId: 'user-1', exp: Date.now() + 60_000 });
    assert.equal(verificarEstadoOAuth(state).integrationId, 'iot-1');
    const [body, signature] = state.split('.');
    const alteredBody = `${body[0] === 'a' ? 'b' : 'a'}${body.slice(1)}`;
    assert.throws(() => verificarEstadoOAuth(`${alteredBody}.${signature}`), /inválido/);
    assert.throws(() => verificarEstadoOAuth(firmarEstadoOAuth({ exp: Date.now() - 1 })), /venció/);
  } finally {
    if (original === undefined) delete process.env.IOT_CREDENTIALS_KEY;
    else process.env.IOT_CREDENTIALS_KEY = original;
  }
});

test('separa habilitación Superadmin, acceso tenant e ingesta máquina a máquina', () => {
  assert.match(routes, /adminControlIndustrialRouter\.use\(requireAuth, requireSuperadmin\)/);
  assert.match(routes, /controlIndustrialRouter\.use\(moduloActivo\)/);
  assert.match(routes, /code: 'modulo_control_no_habilitado'/);
  assert.match(routes, /iotIngestRouter\.post\('\/:token'/);
  assert.match(routes, /webhookTokenHash: hashToken\(req\.params\.token\)/);
});

test('los secretos no salen en respuestas y los comandos exigen doble habilitación', () => {
  assert.match(routes, /const \{ credencialesCifradas, \.\.\.safe \} = item/);
  assert.match(routes, /!module\?\.controlRemotoHabilitado/);
  assert.match(routes, /!device\?\.permiteControl/);
  assert.match(routes, /adaptador de ejecución certificado/);
});

test('el dominio persiste licencia, telemetría, alarmas, retención y comandos por tenant', () => {
  for (const model of ['ModuloControlEmpresa', 'IntegracionIoT', 'DispositivoIoT', 'VariableIoT', 'LecturaIoT', 'ReglaAlarmaIoT', 'AlarmaIoT', 'ComandoIoT']) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /retencionDias\s+Int\s+@default\(365\)/);
  assert.match(schema, /empresaId\s+String/);
});

test('la navegación muestra Control siempre al Superadmin y sólo tras habilitación al tenant', () => {
  assert.match(app, /path="control-industrial"[\s\S]*ControlIndustrialAdmin/);
  assert.match(app, /conAcceso\('control_industrial',[\s\S]*<ControlIndustrial/);
  assert.match(sidebar, /requiresControl: true/);
  assert.match(sidebar, /estadoControl\(\).*setControlHabilitado/);
});

test('eWeLink usa autorización OAuth y no vuelve a pedir un Access Token manual', () => {
  assert.match(controlIndustrial, /Autorizar con eWeLink/);
  assert.match(controlIndustrial, /autorizarSonoff/);
  assert.doesNotMatch(controlIndustrial, /Field label="Access Token"/);
  assert.doesNotMatch(controlIndustrial, /Guardar de forma segura/);
});

test('la PWA comprueba actualizaciones al abrirse y cuando recupera visibilidad', () => {
  assert.match(main, /registerSW\(\{/);
  assert.match(main, /immediate: true/);
  assert.match(main, /registration\.update\(\)/);
  assert.match(main, /visibilitychange/);
});
