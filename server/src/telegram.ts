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
