import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

function key(): Buffer {
  const raw = process.env.IOT_CREDENTIALS_KEY?.trim();
  if (!raw) {
    const error = new Error('Falta IOT_CREDENTIALS_KEY en el servidor. No se guardaron credenciales.');
    (error as Error & { status?: number }).status = 503;
    throw error;
  }
  return createHash('sha256').update(raw, 'utf8').digest();
}

export function cifrarCredenciales(value: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function descifrarCredenciales(payload: string): Record<string, unknown> {
  const [version, ivRaw, tagRaw, encryptedRaw] = payload.split('.');
  if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) throw new Error('Credenciales cifradas inválidas.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, 'base64url')),
    decipher.final(),
  ]);
  return JSON.parse(plain.toString('utf8')) as Record<string, unknown>;
}

export function hashToken(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function firmarEstadoOAuth(value: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  const signature = createHmac('sha256', key()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verificarEstadoOAuth(payload: string): Record<string, unknown> {
  const [body, signature] = payload.split('.');
  if (!body || !signature) throw new Error('Estado OAuth inválido.');
  const expected = createHmac('sha256', key()).update(body).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new Error('Estado OAuth inválido.');
  const value = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
  if (!Number.isFinite(Number(value.exp)) || Number(value.exp) < Date.now()) throw new Error('La autorización venció. Volvé a iniciarla desde ActivaQR.');
  return value;
}
