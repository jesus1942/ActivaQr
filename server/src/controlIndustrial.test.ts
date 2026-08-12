import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizarEventoIoT } from './iotIngest';
import { cifrarCredenciales, descifrarCredenciales, firmarEstadoOAuth, hashToken, verificarEstadoOAuth } from './iotSecrets';
import { clasificarDispositivoEwelink, crearParametrosCanalEwelink, extraerLecturasEwelink } from './ewelinkConnector';
import { escalarValorTuya, normalizarCodigoTuya } from './tuyaConnector';

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

test('cada consulta y mutación de dispositivos queda aislada por la empresa autenticada', () => {
  assert.match(routes, /function tenantId[\s\S]*req\.auth\.empresaId/);
  assert.match(routes, /get\('\/resumen'[\s\S]*findMany\(\{ where: \{ empresaId \}/);
  assert.match(routes, /dispositivoIoT\.findFirst\(\{ where: \{ id: req\.params\.id, empresaId \}/);
  assert.match(routes, /variableIoT\.findFirst\(\{ where: \{ id: req\.params\.id, empresaId \}/);
  assert.match(routes, /integracionIoT\.findFirst\(\{ where: \{ id: req\.params\.id, empresaId, proveedor: 'tuya_cloud' \}/);
  assert.match(routes, /dispositivoIoT\.findFirst\(\{ where: \{ id: params\.dispositivoId, empresaId \}/);
});

test('los secretos no salen en respuestas y los comandos exigen doble habilitación', () => {
  assert.match(routes, /const \{ credencialesCifradas, \.\.\.safe \} = item/);
  assert.match(routes, /!module\?\.controlRemotoHabilitado/);
  assert.match(routes, /!device\?\.permiteControl/);
  assert.match(routes, /ejecutarCanalEwelink/);
  assert.match(routes, /solicitadoPorId: req\.auth!\.userId/);
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

test('eWeLink importa los canales del DUAL R3 sin perder estados escalares', () => {
  const readings = extraerLecturasEwelink({
    switches: [{ switch: 'on', outlet: 0 }, { switch: 'off', outlet: 1 }],
    actPow: 32.4,
    online: 'on',
  });
  assert.equal(readings.switch_1, true);
  assert.equal(readings.switch_2, false);
  assert.equal(readings.actPow, 32.4);
  assert.equal(readings.online, true);
});

test('eWeLink distingue interruptores multicanal y RF Bridge', () => {
  assert.equal(clasificarDispositivoEwelink({ productModel: 'SONOFF DUAL R3', params: { switches: [{ outlet: 0 }, { outlet: 1 }] } }), 'interruptor_multicanal');
  assert.equal(clasificarDispositivoEwelink({ name: 'RF colegio', uiid: 28, params: {} }), 'puente_rf');
});

test('Tuya normaliza sensores, estados y magnitudes eléctricas', () => {
  assert.equal(normalizarCodigoTuya('switch_2'), 'switch_2');
  assert.equal(normalizarCodigoTuya('temp_current'), 'temperature');
  assert.equal(normalizarCodigoTuya('watersensor_state'), 'water');
  assert.equal(normalizarCodigoTuya('cur_current'), 'current');
  assert.equal(normalizarCodigoTuya('cur_voltage'), 'voltage');
  assert.equal(normalizarCodigoTuya('cur_power'), 'actpow');
  assert.equal(escalarValorTuya(2234, { values: '{"scale":1}', unit: 'V' }), 223.4);
  assert.equal(escalarValorTuya(420, { values: '{"scale":0}', unit: 'mA' }), 0.42);
});

test('multimarca limita control a adaptadores certificados y Tuya usa credenciales por tenant', () => {
  const tuya = readFileSync(resolve(process.cwd(), 'src/tuyaConnector.ts'), 'utf8');
  assert.match(routes, /new Set\(\['sonoff_ewelink', 'tuya_cloud', 'milesight_ug65', 'webhook_generico'\]\)/);
  assert.match(routes, /\['sonoff_ewelink', 'tuya_cloud'\]\.includes\(device\.integracion\.proveedor\)/);
  assert.match(routes, /proveedor: \{ in: \['milesight_ug65', 'webhook_generico'\] \}/);
  assert.match(routes, /configurar-tuya[\s\S]*id: req\.params\.id, empresaId, proveedor: 'tuya_cloud'/);
  assert.match(routes, /credencialesCifradas: cifrarCredenciales\(\{ clientId:/);
  assert.match(routes, /integracion: \{ select: \{ proveedor: true \} \}/);
  assert.match(tuya, /procesarEventoIoT\(integration\.id/);
  assert.match(controlIndustrial, /Tuya \/ Smart Life Cloud/);
  assert.match(controlIndustrial, /TuyaCredentialsModal/);
});

test('eWeLink conserva mediciones eléctricas del DUAL R3 por canal', () => {
  const readings = extraerLecturasEwelink({
    switches: [{ switch: 'on', outlet: 0 }, { switch: 'off', outlet: 1 }],
    current: ['0.42', '0.00'],
    voltage: [221.7, 221.5],
    actPow: ['87.5', '0'],
    dayKwh: ['0.62', '0.11'],
  });
  assert.equal(readings.current_1, 0.42);
  assert.equal(readings.current_2, 0);
  assert.equal(readings.voltage_1, 221.7);
  assert.equal(readings.actPow_1, 87.5);
  assert.equal(readings.dayKwh_2, 0.11);
  assert.doesNotMatch(controlIndustrial, /current_\[0-9\]\+\|voltage_\[0-9\]\+/);
  assert.match(controlIndustrial, /channelMetrics/);
  const ingest = readFileSync(resolve(process.cwd(), 'src/iotIngest.ts'), 'utf8');
  assert.match(ingest, /previous\.nombre === rawKey/);
  assert.match(ingest, /previous\.unidad \?\? meta\.unidad/);
});

test('clasifica sensores ambientales, magnéticos e inundación sin degradarlos a genérico', () => {
  assert.equal(clasificarDispositivoEwelink({ productModel: 'SNZB-02P Temperature Humidity', params: { temperature: 20, humidity: 55 } }), 'sensor_ambiente');
  assert.equal(clasificarDispositivoEwelink({ productModel: 'Door Window Sensor', params: { door: true } }), 'sensor_magnetico');
  assert.equal(clasificarDispositivoEwelink({ productModel: 'Water Leak Sensor', params: { waterLeak: false } }), 'sensor_inundacion');
  assert.equal(clasificarDispositivoEwelink({ productModel: 'TH Elite', params: { switch: 'on', currentTemperature: 20 } }), 'interruptor');
  assert.equal(extraerLecturasEwelink({ door: 'open', waterLeak: 'dry' }).door, true);
  assert.equal(extraerLecturasEwelink({ door: 'open', waterLeak: 'dry' }).waterLeak, false);
});

test('el comando DUAL R3 conserva el otro canal y sólo cambia el elegido', () => {
  assert.deepEqual(crearParametrosCanalEwelink(1, true, { 0: false, 1: false }), {
    switches: [{ outlet: 0, switch: 'off' }, { outlet: 1, switch: 'on' }],
  });
  assert.throws(() => crearParametrosCanalEwelink(4, true), /entre 1 y 4/);
});

test('el control remoto ejecuta eWeLink, audita el resultado y excluye el RF Bridge', () => {
  const connector = readFileSync(resolve(process.cwd(), 'src/ewelinkConnector.ts'), 'utf8');
  assert.match(connector, /\/v2\/device\/thing\/status/);
  assert.match(routes, /ejecutarCanalEwelink/);
  assert.match(routes, /estado: 'ejecutado'/);
  assert.match(routes, /device\.tipo === 'puente_rf'/);
  assert.match(controlIndustrial, /Confirmá la operación/);
  assert.match(controlIndustrial, /Operar luces/);
  assert.doesNotMatch(controlIndustrial, /Falta un adaptador de ejecución certificado/);
});

test('permite alias por dispositivo y canal sin perderlos al sincronizar', () => {
  assert.match(routes, /patch\('\/dispositivos\/:id'/);
  assert.match(routes, /patch\('\/variables\/:id'/);
  assert.match(routes, /data: \{ nombre \}/);
  assert.match(controlIndustrial, /Nombres de los canales/);
  assert.match(controlIndustrial, /actualizarVariable/);
});

test('refresca el tablero y eWeLink cada 5 segundos', () => {
  const connector = readFileSync(resolve(process.cwd(), 'src/ewelinkConnector.ts'), 'utf8');
  assert.match(controlIndustrial, /setInterval\(\(\) => load\(true\), 5_000\)/);
  assert.match(connector, /Math\.max\(5, Number\(config\.pollingSeconds\)/);
  assert.match(connector, /sincronizarEwelinkProgramado[\s\S]*1_000/);
});

test('exporta logs por dispositivo o canal y evita duplicados cada cinco segundos', () => {
  const ingest = readFileSync(resolve(process.cwd(), 'src/iotIngest.ts'), 'utf8');
  assert.match(routes, /variables\/:id\/historial\.csv/);
  assert.match(routes, /dispositivos\/:id\/historial\.csv/);
  assert.match(routes, /X-ActivaQR-Truncated/);
  assert.match(ingest, /changed \|\| checkpointDue/);
  assert.match(controlIndustrial, /Exportar canal/);
  assert.match(controlIndustrial, /Exportar 24 h/);
});

test('Control Industrial conserva una interfaz mobile-first operable', () => {
  assert.match(controlIndustrial, /snap-x/);
  assert.match(controlIndustrial, /items-end justify-center[\s\S]*sm:items-center/);
  assert.match(controlIndustrial, /pb-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(controlIndustrial, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(controlIndustrial, /col-span-2 min-h-12 bg-cyan-700/);
  assert.doesNotMatch(controlIndustrial, /truncate font-display text-lg font-black text-content/);
});

test('alarmas booleanas, push, desconexiones y escenas quedan cubiertos de extremo a extremo', () => {
  const ingest = readFileSync(resolve(process.cwd(), 'src/iotIngest.ts'), 'utf8');
  assert.match(routes, /booleanoEstricto/);
  assert.match(routes, /Elegí si la condición debe estar activa o inactiva/);
  assert.match(routes, /notificaciones\/prueba/);
  assert.match(ingest, /evaluarDesconexionesIoT/);
  assert.match(ingest, /condicionDesde/);
  assert.match(ingest, /Dispositivo sin conexión/);
  assert.match(schema, /model EscenaIoT \{/);
  assert.match(routes, /post\('\/escenas'/);
  assert.match(routes, /escenas\/:id\/ejecutar/);
  assert.match(controlIndustrial, /Avisos en este celular/);
  assert.match(controlIndustrial, /Escenas de control/);
  assert.match(controlIndustrial, /Activo \/ detectado \/ abierto/);
});

test('la PWA comprueba actualizaciones al abrirse y cuando recupera visibilidad', () => {
  assert.match(main, /registerSW\(\{/);
  assert.match(main, /immediate: true/);
  assert.match(main, /registration\.update\(\)/);
  assert.match(main, /visibilitychange/);
});
