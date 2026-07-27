const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

async function sendMessage(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN no configurado');
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('[telegram] Error al enviar mensaje:', body);
  }
}

export async function enviarLinkRecuperacion(opts: {
  chatId: string;
  nombre: string;
  resetUrl: string;
  motivo?: 'autoservicio' | 'admin-reset';
}): Promise<void> {
  const esAdminReset = opts.motivo === 'admin-reset';
  const titulo = esAdminReset
    ? '<b>ActivaQR — Contraseña reseteada por seguridad</b>'
    : '<b>ActivaQR — Recuperar contraseña</b>';
  const cuerpo = esAdminReset
    ? `Hola ${opts.nombre}, por seguridad el equipo de soporte de ActivaQR reseteó tu contraseña actual. Ya no funciona para iniciar sesión.\n\nCreá una nueva en este enlace (válido por 1 hora):\n${opts.resetUrl}\n\nDespués de creada, podés volver a entrar normalmente.`
    : `Hola ${opts.nombre}, recibimos una solicitud para restablecer tu contraseña.\n\nHacé clic en el siguiente enlace (válido por 1 hora):\n${opts.resetUrl}\n\nSi no lo pediste vos, ignorá este mensaje.`;
  await sendMessage(opts.chatId, `${titulo}\n\n${cuerpo}`);
}

export async function notificarAdminRecuperacion(opts: {
  adminChatId: string;
  clienteNombre: string;
  clienteEmail: string;
  resetUrl: string;
}): Promise<void> {
  const texto = `<b>ActivaQR — Solicitud de recuperacion</b>\n\nCliente sin Telegram configurado:\n<b>${opts.clienteNombre}</b> (${opts.clienteEmail})\n\nLink de recuperacion (1 hora):\n${opts.resetUrl}\n\nReenviale este link al cliente.`;
  await sendMessage(opts.adminChatId, texto);
}

/**
 * Aviso al dueño de ActivaQR de un alta autogestionada desde la landing.
 * Usa TELEGRAM_ADMIN_CHAT_ID; si no está configurado, no hace nada.
 */
export async function notificarAltaTrial(opts: {
  empresaNombre: string;
  adminNombre: string;
  adminEmail: string;
  adminTelefono?: string | null;
  trialFin: Date;
}): Promise<void> {
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!adminChatId) return;
  const vence = opts.trialFin.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const telefono = opts.adminTelefono ? `\nTel: ${opts.adminTelefono}` : '';
  const texto =
    `<b>ActivaQR — Alta nueva desde la landing</b>\n\n` +
    `<b>${opts.empresaNombre}</b>\n` +
    `${opts.adminNombre} (${opts.adminEmail})${telefono}\n\n` +
    `Plan inicial en trial, vence el ${vence}.`;
  await sendMessage(adminChatId, texto);
}
