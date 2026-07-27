import { createHash, randomBytes } from 'crypto';

/**
 * Tokens de recuperación de contraseña.
 *
 * El token viaja al usuario en el link (por email o Telegram) pero en la base
 * se guarda solo su hash: si alguien obtiene una copia de la tabla Usuario no
 * puede usar los tokens vigentes para tomar cuentas ajenas. Es el mismo
 * criterio que ya se aplica a las contraseñas.
 *
 * SHA-256 sin salt es suficiente acá — a diferencia de una contraseña, el token
 * son 256 bits aleatorios, así que no hay diccionario ni fuerza bruta viable.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/** Genera el token que se envía al usuario y el hash que se guarda en la DB. */
export function generarResetToken(): { token: string; tokenHash: string; expiry: Date } {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashResetToken(token),
    expiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

/** Hash de un token recibido, para buscarlo en la DB. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(String(token)).digest('hex');
}
