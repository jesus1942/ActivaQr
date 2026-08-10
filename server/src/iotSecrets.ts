import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

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
