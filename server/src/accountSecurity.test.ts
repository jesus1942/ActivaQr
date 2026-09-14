import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/** Pruebas HTTP con almacenamiento en memoria y Telegram simulado; no envían mensajes reales. */
test('seguridad de sesiones y canal de recuperación', async (t) => {
  process.env.JWT_SECRET = 'test-only-account-security-secret';
  process.env.TELEGRAM_BOT_TOKEN = 'test-only-telegram-token';
  process.env.RESEND_API_KEY = '';
  // Inyectar el singleton antes de importar rutas: ninguna operación toca una DB real.
  const noImplementado = () => { throw new Error('Operación de DB no simulada'); };
  (globalThis as any).prisma = {
    usuario: { findUnique: noImplementado, findUniqueOrThrow: noImplementado, findFirst: noImplementado, updateMany: noImplementado },
    registroAuditoria: { create: noImplementado },
  };
  const { prisma } = await import('./prisma');
  const { firmarToken, requireAuth, hashCodigoTelegram } = await import('./auth');
  const { hashResetToken } = await import('./resetTokens');
  const { default: authRouter } = await import('./routes/auth');
  const password = 'Clave-de-prueba-123';
  let usuario: Record<string, any> = {};
  let token = '';
  let enviado = '';
  let envios = 0;
  let falloEnvio = false;
  let numero = 0;
  let antesDeGuardar: (() => void) | null = null;

  // La comparación aplica las condiciones de updateMany antes de mutar, como una escritura atómica.
  const coincide = (where: Record<string, any>) => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return (value.gt === undefined || usuario[key] > value.gt) &&
        (value.lt === undefined || usuario[key] < value.lt);
    }
    return usuario[key] === value;
  });
  const leer = async ({ where }: any) => coincide(where) ? { ...usuario } : null;
  t.mock.method(prisma.usuario, 'findUnique', leer);
  t.mock.method(prisma.usuario, 'findUniqueOrThrow', async (args: any) => {
    const encontrado = await leer(args);
    if (!encontrado) throw new Error('Usuario inexistente');
    return encontrado;
  });
  t.mock.method(prisma.usuario, 'findFirst', leer);
  t.mock.method(prisma.usuario, 'updateMany', async ({ where, data }: any) => {
    const intercalar = antesDeGuardar; antesDeGuardar = null; intercalar?.();
    if (!coincide(where)) return { count: 0 };
    for (const [key, value] of Object.entries(data)) {
      usuario[key] = value && typeof value === 'object' && 'increment' in value
        ? usuario[key] + (value as any).increment : value;
    }
    return { count: 1 };
  });
  t.mock.method(prisma.registroAuditoria, 'create', async () => ({}));
  const fetchReal = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (input: any, init?: any) => {
    if (String(input).startsWith('https://api.telegram.org/')) {
      envios++;
      const mensaje = JSON.parse(init.body);
      enviado = mensaje.text.match(/\b\d{6}\b/)?.[0] ?? '';
      return new Response(JSON.stringify({ ok: !falloEnvio }), { status: falloEnvio ? 502 : 200 });
    }
    assert.match(String(input), /^http:\/\/127\.0\.0\.1:/, 'los tests no pueden acceder a servicios externos');
    return fetchReal(input, init);
  });
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }));
  app.use('/auth', authRouter);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  t.after(() => { server.closeAllConnections(); server.close(); t.mock.restoreAll(); });

  const reiniciar = async () => {
    usuario = {
      id: `user-${++numero}`, email: 'test@example.invalid', rol: 'admin', empresaId: 'empresa-test',
      activo: true, nombre: 'Prueba', passwordHash: await bcrypt.hash(password, 4),
      telegramChatId: '111111', telegramAlertasHabilitadas: false,
      telegramPendingChatId: null, telegramLinkCodeHash: null, telegramLinkExpires: null, telegramLinkAttempts: 0,
      resetToken: null, resetTokenExpiry: null,
    };
    token = firmarToken({ userId: usuario.id, email: usuario.email, rol: usuario.rol, empresaId: usuario.empresaId }, usuario.passwordHash);
    enviado = ''; envios = 0; falloEnvio = false; antesDeGuardar = null;
  };
  const pedir = (path: string, body?: any, method = 'POST', bearer = token) => fetch(`${base}${path}`, {
    method, headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  await t.test('cambiar contraseña revoca el JWT anterior y acepta una nueva sesión', async () => {
    await reiniciar();
    assert.equal((await pedir('/protected', undefined, 'GET')).status, 200);
    usuario.passwordHash = await bcrypt.hash('Otra-clave-segura-456', 4);
    assert.equal((await pedir('/protected', undefined, 'GET')).status, 401);
    const nuevo = firmarToken({ userId: usuario.id, email: usuario.email, rol: usuario.rol, empresaId: usuario.empresaId }, usuario.passwordHash);
    assert.equal((await pedir('/protected', undefined, 'GET', nuevo)).status, 200);
    const legado = jwt.sign({ userId: usuario.id, email: usuario.email, rol: usuario.rol, empresaId: usuario.empresaId }, process.env.JWT_SECRET!);
    assert.equal((await pedir('/protected', undefined, 'GET', legado)).status, 401);
    assert.equal(JSON.stringify(jwt.decode(nuevo)).includes(usuario.passwordHash), false);
  });

  await t.test('reset consume el enlace una sola vez incluso con solicitudes concurrentes', async () => {
    await reiniciar();
    usuario.resetToken = hashResetToken('token-de-prueba'); usuario.resetTokenExpiry = new Date(Date.now() + 60000);
    const respuestas = await Promise.all([1, 2].map(() => pedir('/auth/reset-password', { token: 'token-de-prueba', password: 'Nueva-clave-123' })));
    assert.deepEqual(respuestas.map(r => r.status).sort(), [200, 400]);
    assert.equal((await pedir('/protected', undefined, 'GET')).status, 401);
    assert.equal(usuario.resetToken, null);
  });

  await t.test('recuperación concurrente con cambio de canal no emite al Telegram anterior', async () => {
    await reiniciar();
    antesDeGuardar = () => { usuario.telegramChatId = '222222'; usuario.resetToken = null; };
    const respuesta = await pedir('/auth/forgot-password', { email: usuario.email });
    assert.equal(respuesta.status, 200);
    assert.equal(usuario.resetToken, null); assert.equal(envios, 0);
  });

  await t.test('una sesión sola no cambia ni elimina el canal de recuperación', async () => {
    await reiniciar();
    assert.equal((await pedir('/auth/perfil', { telegramChatId: '222222' }, 'PATCH')).status, 400);
    assert.equal((await pedir('/auth/perfil', { telegramChatId: null }, 'PATCH')).status, 403);
    assert.equal((await pedir('/auth/telegram/vincular', { telegramChatId: '222222', password: 'incorrecta' })).status, 403);
    assert.equal(usuario.telegramChatId, '111111'); assert.equal(envios, 0);
  });

  await t.test('vincular exige contraseña y código; invalida enlaces anteriores y rechaza reutilización', async () => {
    await reiniciar();
    usuario.resetToken = 'old-reset-hash';
    const respuesta = await pedir('/auth/telegram/vincular', { telegramChatId: '222222', password });
    assert.equal(respuesta.status, 200); assert.equal(usuario.telegramChatId, '111111');
    assert.match(enviado, /^\d{6}$/);
    assert.deepEqual(await respuesta.json(), { ok: true });
    assert.notEqual(usuario.telegramLinkCodeHash, enviado);
    assert.equal((await pedir('/auth/telegram/confirmar', { code: enviado, telegramAlertasHabilitadas: true })).status, 200);
    assert.equal(usuario.telegramChatId, '222222'); assert.equal(usuario.resetToken, null);
    assert.equal(usuario.telegramAlertasHabilitadas, true);
    assert.equal((await pedir('/auth/telegram/confirmar', { code: enviado })).status, 400);
  });

  await t.test('cinco códigos incorrectos agotan el desafío aunque después se conozca el correcto', async () => {
    await reiniciar();
    await pedir('/auth/telegram/vincular', { telegramChatId: '222222', password });
    const incorrecto = enviado === '000000' ? '111111' : '000000';
    const respuestas = await Promise.all(Array.from({ length: 6 }, () => pedir('/auth/telegram/confirmar', { code: incorrecto })));
    assert.ok(respuestas.every(r => r.status === 400));
    assert.equal(usuario.telegramLinkAttempts, 5);
    assert.equal((await pedir('/auth/telegram/confirmar', { code: enviado })).status, 400);
    assert.equal(usuario.telegramChatId, '111111');
  });

  await t.test('código vencido y envío fallido nunca cambian el canal', async () => {
    await reiniciar();
    await pedir('/auth/telegram/vincular', { telegramChatId: '222222', password });
    usuario.telegramLinkExpires = new Date(0);
    assert.equal((await pedir('/auth/telegram/confirmar', { code: enviado })).status, 400);
    falloEnvio = true;
    assert.equal((await pedir('/auth/telegram/vincular', { telegramChatId: '333333', password })).status, 502);
    assert.equal(usuario.telegramLinkCodeHash, null); assert.equal(usuario.telegramChatId, '111111');
  });

  await t.test('desvinculación verifica contraseña e invalida recuperación; consentimiento no pide contraseña', async () => {
    await reiniciar();
    assert.equal((await pedir('/auth/perfil', { telegramAlertasHabilitadas: true }, 'PATCH')).status, 200);
    usuario.resetToken = 'anterior';
    assert.equal((await pedir('/auth/perfil', { telegramChatId: null, password, telegramAlertasHabilitadas: false }, 'PATCH')).status, 200);
    assert.equal(usuario.telegramChatId, null); assert.equal(usuario.resetToken, null);
    assert.equal(usuario.telegramAlertasHabilitadas, false);
  });

  await t.test('el código está ligado a la cuenta, el chat y la contraseña', async () => {
    await reiniciar();
    const hash = hashCodigoTelegram(usuario.id, '222222', usuario.passwordHash, '123456');
    assert.notEqual(hash, hashCodigoTelegram('otro-user', '222222', usuario.passwordHash, '123456'));
    assert.notEqual(hash, hashCodigoTelegram(usuario.id, '333333', usuario.passwordHash, '123456'));
    assert.notEqual(hash, hashCodigoTelegram(usuario.id, '222222', 'otro-hash', '123456'));
  });
});
