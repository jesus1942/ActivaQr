import test from 'node:test';
import assert from 'node:assert/strict';
import { registrarWebhookTelegram } from './telegramWebhookSetup';

test('registro seguro conserva destino, filtros y conexiones sin borrar pendientes', async () => {
  const url = 'https://api.activaqr.net/api/telegram/webhook';
  const llamadas: { url: string; body: any }[] = [];
  const fake = (async (input, init) => {
    llamadas.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    const result = String(input).endsWith('/setWebhook') ? true : { url, max_connections: 12, allowed_updates: ['message'], pending_update_count: 5 };
    return new Response(JSON.stringify({ ok: true, result }));
  }) as typeof fetch;
  assert.equal(await registrarWebhookTelegram({ TELEGRAM_WEBHOOK_AUTO_REGISTER: 'true', TELEGRAM_BOT_TOKEN: 'test-token', TELEGRAM_WEBHOOK_SECRET: 'test-secret' }, fake), 'registered');
  assert.equal(llamadas.length, 3);
  assert.deepEqual(llamadas[1].body, { url, secret_token: 'test-secret', drop_pending_updates: false, max_connections: 12, allowed_updates: ['message'] });
  assert.ok(llamadas.every(c => c.url.startsWith('https://api.telegram.org/')));
});

test('no opera si está desactivado y no cambia webhooks ajenos', async () => {
  let llamadas = 0;
  const fake = (async () => { llamadas++; return new Response(JSON.stringify({ ok: true, result: { url: 'https://otro.example/webhook' } })); }) as typeof fetch;
  assert.equal(await registrarWebhookTelegram({}, fake), 'disabled');
  assert.equal(llamadas, 0);
  await assert.rejects(registrarWebhookTelegram({ TELEGRAM_WEBHOOK_AUTO_REGISTER: 'true', TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_WEBHOOK_SECRET: 'test' }, fake), /destino_ajeno/);
  assert.equal(llamadas, 1);
});

test('errores no exponen URLs con tokens ni cuerpos remotos', async () => {
  const env = { TELEGRAM_WEBHOOK_AUTO_REGISTER: 'true', TELEGRAM_BOT_TOKEN: 'credencial-no-imprimir', TELEGRAM_WEBHOOK_SECRET: 'secret-test' };
  const fake = (async () => { throw new Error('https://api.telegram.org/botcredencial-no-imprimir/getWebhookInfo'); }) as typeof fetch;
  await assert.rejects(registrarWebhookTelegram(env, fake), (e: Error) => e.message === 'telegram_getWebhookInfo_fallo');
});
