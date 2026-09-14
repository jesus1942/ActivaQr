type WebhookInfo = { url: string; has_custom_certificate?: boolean; max_connections?: number; allowed_updates?: string[]; pending_update_count?: number };
const DESTINO = 'https://api.activaqr.net/api/telegram/webhook';
const DESTINOS_PROPIOS = new Set([DESTINO, 'https://activaqr-production.up.railway.app/api/telegram/webhook']);

/** Registra el secreto desde el servidor; nunca devuelve ni registra credenciales. */
export async function registrarWebhookTelegram(
  env: NodeJS.ProcessEnv = process.env,
  solicitar: typeof fetch = fetch,
): Promise<'disabled' | 'registered'> {
  if (env.TELEGRAM_WEBHOOK_AUTO_REGISTER !== 'true') return 'disabled';
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret || !/^[A-Za-z0-9_-]{1,256}$/.test(secret)) throw new Error('configuracion_incompleta');
  // Solo el host oficial recibe el token. Se descartan cuerpos y errores remotos para no filtrarlo.
  const llamar = async (metodo: string, body: Record<string, unknown> = {}) => {
    try {
      const respuesta = await solicitar(`https://api.telegram.org/bot${token}/${metodo}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json() as { ok: boolean; result: unknown };
      if (!datos.ok) throw new Error();
      return datos.result;
    } catch { throw new Error(`telegram_${metodo}_fallo`); }
  };
  const previo = await llamar('getWebhookInfo') as WebhookInfo;
  // No apropiarse de un bot que pertenezca a otro sistema ni reemplazar certificados privados.
  if (!previo || typeof previo.url !== 'string' || (previo.url && !DESTINOS_PROPIOS.has(previo.url))) {
    throw new Error('destino_ajeno');
  }
  if (previo.has_custom_certificate) throw new Error('certificado_personalizado');
  const url = previo.url || DESTINO;
  const parametros: Record<string, unknown> = { url, secret_token: secret, drop_pending_updates: false };
  if (previo.max_connections !== undefined) parametros.max_connections = previo.max_connections;
  if (previo.allowed_updates !== undefined) parametros.allowed_updates = previo.allowed_updates;
  // Resolver el dominio por DNS, sin fijar la IP transitoria que informa getWebhookInfo.
  if (await llamar('setWebhook', parametros) !== true) throw new Error('registro_no_confirmado');
  const actual = await llamar('getWebhookInfo') as WebhookInfo;
  if (actual?.url !== url) throw new Error('verificacion_destino_fallo');
  return 'registered';
}

/** Reintenta fallos transitorios sin impedir el arranque de la API. */
export function iniciarRegistroWebhookTelegram(): void {
  let intentos = 0;
  const intentar = async () => {
    try {
      const estado = await registrarWebhookTelegram();
      if (estado === 'registered') console.log('[telegram-webhook] registro seguro confirmado');
    } catch (error) {
      const codigo = error instanceof Error ? error.message : 'fallo';
      console.error('[telegram-webhook]', codigo);
      if (++intentos < 3 && codigo.startsWith('telegram_')) setTimeout(intentar, 30000).unref();
    }
  };
  void intentar();
}
