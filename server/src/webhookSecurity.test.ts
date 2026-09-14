import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { requireMercadoPagoSignature, requireTelegramWebhookSecret } from './webhookSecurity';

/** HTTP local: cuenta efectos autorizados sin enviar mensajes ni consultar APIs reales. */
test('webhooks rechazan secretos ausentes, firmas falsas y sustitución del ID', async (t) => {
  const prev = [process.env.MP_WEBHOOK_SECRET, process.env.TELEGRAM_WEBHOOK_SECRET];
  const app = express();
  app.use(express.json());
  let efectos = 0;
  app.post('/mp', requireMercadoPagoSignature, (_req, res) => {
    efectos++;
    res.json({ id: res.locals.mercadoPagoDataId });
  });
  app.post('/telegram', requireTelegramWebhookSecret, (_req, res) => {
    efectos++;
    res.sendStatus(200);
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
    ['MP_WEBHOOK_SECRET', 'TELEGRAM_WEBHOOK_SECRET'].forEach((name, i) => {
      if (prev[i] === undefined) delete process.env[name];
      else process.env[name] = prev[i];
    });
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (path: string, headers: Record<string, string> = {}, body = {}) => fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  delete process.env.MP_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  assert.equal((await post('/mp')).status, 503);
  assert.equal((await post('/telegram')).status, 503);
  assert.equal(efectos, 0);
  process.env.TELEGRAM_WEBHOOK_SECRET = 'local-test-secret';
  assert.equal((await post('/telegram')).status, 401);
  assert.equal((await post('/telegram', { 'x-telegram-bot-api-secret-token': 'wrong' })).status, 401);
  assert.equal(efectos, 0);
  assert.equal((await post('/telegram', { 'x-telegram-bot-api-secret-token': 'local-test-secret' })).status, 200);
  assert.equal(efectos, 1);
  process.env.MP_WEBHOOK_SECRET = 'mp-local-test';
  const hash = createHmac('sha256', 'mp-local-test').update('id:abc123;request-id:request-1;ts:1700000000;').digest('hex');
  const headers = { 'x-request-id': 'request-1', 'x-signature': `ts=1700000000, v1=${hash}` };
  const casos: [string, Record<string, string>][] = [
    ['/mp?data.id=abc123', {}],
    ['/mp?data.id=changed', headers],
    ['/mp', headers],
    ['/mp?id=abc123', headers],
    ['/mp?data.id=abc123&data.id=other', headers],
    ['/mp?data.id=abc123', { ...headers, 'x-request-id': 'different' }],
    ['/mp?data.id=abc123', { ...headers, 'x-signature': `ts=1700000001,v1=${hash}` }],
    ['/mp?data.id=abc123', { ...headers, 'x-signature': 'ts=1700000000,v1=bad' }],
    ['/mp?data.id=abc123', { ...headers, 'x-signature': headers['x-signature'] + ',ts=1700000000' }],
  ];
  for (const [path, cabeceras] of casos) {
    assert.equal((await post(path, cabeceras, { data: { id: 'abc123' } })).status, 401, path);
  }
  assert.equal(efectos, 1);
  const valido = await post('/mp?data.id=ABC123', headers, { data: { id: 'untrusted-body-id' } });
  assert.equal(valido.status, 200);
  assert.deepEqual(await valido.json(), { id: 'abc123' });
  assert.equal(efectos, 2);
});
