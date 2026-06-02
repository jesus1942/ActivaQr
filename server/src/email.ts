/**
 * Envío de emails transaccionales vía Resend.
 * Requiere la variable de entorno RESEND_API_KEY.
 * Si no está configurada, las funciones retornan sin error (modo silencioso).
 */

export function emailConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function getResend() {
  const { Resend } = require('resend');
  return new Resend(process.env.RESEND_API_KEY);
}

function plantillaSuscripcion(params: {
  empresaNombre: string;
  adminNombre: string;
  linkPago: string;
  monto: number;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Activar suscripción — ActivaQR</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:24px 32px;border:3px solid #0f172a;border-bottom:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;color:#f97316;text-transform:uppercase;letter-spacing:2px;">
                      ActivaQR
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                      Gestión de activos industriales
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="background:#ffffff;border:3px solid #0f172a;border-top:none;padding:32px;">

              <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:1px;">
                Activación de suscripción
              </p>
              <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#0f172a;line-height:1.2;">
                Hola${params.adminNombre ? `, ${params.adminNombre}` : ''}!
              </h1>

              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
                Te enviamos el link para activar la suscripción de
                <strong style="color:#0f172a;">${params.empresaNombre}</strong>
                en ActivaQR.
              </p>

              <!-- Recuadro de monto -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#fff7ed;border:2px solid #f97316;padding:16px 20px;">
                    <span style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1px;">
                      Monto mensual
                    </span>
                    <br />
                    <span style="font-size:28px;font-weight:900;color:#0f172a;">
                      $${params.monto.toLocaleString('es-AR')} ARS
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Botón CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <a href="${params.linkPago}"
                       style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;padding:14px 28px;border:3px solid #0f172a;box-shadow:4px 4px 0px #0f172a;">
                      Activar suscripción →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.5;">
                O copiá y pegá este link en tu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#0f172a;background:#f8fafc;border:2px solid #e2e8f0;padding:10px 14px;word-break:break-all;font-family:monospace;">
                ${params.linkPago}
              </p>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.5;">
                Si tenés alguna consulta respondé este email o contactanos por WhatsApp.
                Estaremos encantados de ayudarte.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:16px 32px;border:3px solid #0f172a;border-top:none;">
              <p style="margin:0;font-size:11px;color:#475569;text-align:center;">
                © ${new Date().getFullYear()} ActivaQR — Este email fue enviado automáticamente.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function enviarEmailSuscripcion(params: {
  destinatario: string;
  empresaNombre: string;
  adminNombre: string;
  linkPago: string;
  monto: number;
}): Promise<void> {
  if (!emailConfigurado()) return;

  const resend = getResend();
  const from = process.env.RESEND_FROM || 'ActivaQR <noreply@activaqr.com>';

  await resend.emails.send({
    from,
    to: params.destinatario,
    subject: `Activá tu suscripción en ActivaQR — ${params.empresaNombre}`,
    html: plantillaSuscripcion(params),
  });
}

export interface LeadDatos {
  nombre: string;
  empresa?: string;
  email: string;
  telefono?: string;
  mensaje?: string;
}

/**
 * Envía la notificación de un nuevo lead capturado desde la landing.
 * Destinatario: LEAD_EMAIL (o RESEND_FROM como fallback). Si no hay Resend
 * configurado, retorna sin error (el endpoint igual loguea el lead).
 */
export async function enviarEmailLead(lead: LeadDatos): Promise<boolean> {
  if (!emailConfigurado()) return false;
  const destino = process.env.LEAD_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!destino) return false;

  const resend = getResend();
  const from = process.env.RESEND_FROM || 'ActivaQR <noreply@activaqr.com>';
  const fila = (k: string, v?: string) =>
    v ? `<tr><td style="padding:6px 0;font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;width:130px;vertical-align:top;">${k}</td><td style="padding:6px 0;font-size:14px;color:#0f172a;">${v}</td></tr>` : '';

  await resend.emails.send({
    from,
    to: destino,
    replyTo: lead.email,
    subject: `Nuevo lead ActivaQR — ${lead.nombre}${lead.empresa ? ` (${lead.empresa})` : ''}`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="background:#0f172a;padding:20px 28px;border:3px solid #0f172a;border-bottom:none;">
  <span style="font-size:20px;font-weight:900;color:#f97316;text-transform:uppercase;letter-spacing:2px;">ActivaQR</span>
  <span style="float:right;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Nuevo lead</span>
</td></tr>
<tr><td style="background:#fff;border:3px solid #0f172a;border-top:none;padding:28px;">
  <h1 style="margin:0 0 18px;font-size:22px;font-weight:900;color:#0f172a;">Solicitud de acceso</h1>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${fila('Nombre', lead.nombre)}
    ${fila('Empresa', lead.empresa)}
    ${fila('Email', `<a href="mailto:${lead.email}" style="color:#f97316;">${lead.email}</a>`)}
    ${fila('Teléfono', lead.telefono)}
    ${fila('Mensaje', lead.mensaje)}
  </table>
  <p style="margin:18px 0 8px;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Responder directamente</p>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td style="padding:0 8px 0 0;">
        <a href="mailto:${lead.email}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;font-weight:900;font-size:13px;padding:10px 20px;border:2px solid #0f172a;text-transform:uppercase;letter-spacing:1px;">
          Responder por Email
        </a>
      </td>
      ${lead.telefono ? `<td>
        <a href="https://wa.me/${lead.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${lead.nombre}! Te contacto desde ActivaQR en respuesta a tu solicitud de acceso.`)}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;font-weight:900;font-size:13px;padding:10px 20px;border:2px solid #22c55e;text-transform:uppercase;letter-spacing:1px;">
          WhatsApp
        </a>
      </td>` : ''}
    </tr>
  </table>
  <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">Responder este email va directamente a ${lead.email}</p>
</td></tr>
<tr><td style="background:#0f172a;padding:14px 28px;border:3px solid #0f172a;border-top:none;">
  <p style="margin:0;font-size:11px;color:#475569;text-align:center;">© ${new Date().getFullYear()} ActivaQR — Lead capturado desde la landing.</p>
</td></tr>
</table></td></tr></table></body></html>`,
  });
  return true;
}

export async function enviarEmailResetPassword(params: {
  destinatario: string;
  adminNombre: string;
  token: string;
  resetUrl: string;
}): Promise<void> {
  if (!emailConfigurado()) return;
  const resend = getResend();
  const from = process.env.RESEND_FROM || 'ActivaQR <noreply@activaqr.com>';
  await resend.emails.send({
    from,
    to: params.destinatario,
    subject: 'Recuperar contraseña — ActivaQR',
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="background:#0f172a;padding:24px 32px;border:3px solid #0f172a;border-bottom:none;">
  <span style="font-size:22px;font-weight:900;color:#f97316;text-transform:uppercase;letter-spacing:2px;">ActivaQR</span>
</td></tr>
<tr><td style="background:#fff;border:3px solid #0f172a;border-top:none;padding:32px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:1px;">Recuperar contrasena</p>
  <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;color:#0f172a;">Hola${params.adminNombre ? `, ${params.adminNombre}` : ''}!</h1>
  <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">Recibimos una solicitud para restablecer la contrasena de tu cuenta en <strong>ActivaQR</strong>. El link es valido por 1 hora.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td>
    <a href="${params.resetUrl}" style="display:inline-block;background:#f97316;color:#fff;font-size:15px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;padding:14px 28px;border:3px solid #0f172a;box-shadow:4px 4px 0px #0f172a;">
      Restablecer contrasena &rarr;
    </a>
  </td></tr></table>
  <p style="margin:0 0 8px;font-size:13px;color:#64748b;">O copia y pega este link en tu navegador:</p>
  <p style="margin:0 0 20px;font-size:12px;color:#0f172a;background:#f8fafc;border:2px solid #e2e8f0;padding:10px 14px;word-break:break-all;font-family:monospace;">${params.resetUrl}</p>
  <p style="margin:0;font-size:12px;color:#94a3b8;">Si no solicitaste este cambio, ignora este email. Tu contrasena no sera modificada.</p>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 32px;border:3px solid #0f172a;border-top:none;">
  <p style="margin:0;font-size:11px;color:#475569;text-align:center;">© ${new Date().getFullYear()} ActivaQR</p>
</td></tr>
</table></td></tr></table></body></html>`,
  });
}

export async function enviarEmailAccesoRemoto(params: {
  destinatario: string;
  empresaNombre: string;
  adminNombre: string;
  linkAprobacion: string;
  costoMensual: number | null;
}): Promise<void> {
  if (!emailConfigurado()) return;
  const resend = getResend();
  const from = process.env.RESEND_FROM || 'ActivaQR <noreply@activaqr.com>';
  const costoTexto = params.costoMensual
    ? `<p style="margin:0 0 20px;font-size:13px;color:#475569;">Este servicio tiene un costo adicional de <strong style="color:#0f172a;">$${params.costoMensual.toLocaleString('es-AR')} ARS/mes</strong> que se sumará a tu suscripción.</p>`
    : '';
  await resend.emails.send({
    from,
    to: params.destinatario,
    subject: `Solicitud de acceso remoto — ActivaQR`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
<tr><td style="background:#0f172a;padding:24px 32px;border:3px solid #0f172a;border-bottom:none;">
  <span style="font-size:22px;font-weight:900;color:#f97316;text-transform:uppercase;letter-spacing:2px;">ActivaQR</span>
</td></tr>
<tr><td style="background:#fff;border:3px solid #0f172a;border-top:none;padding:32px;">
  <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:1px;">Solicitud de soporte remoto</p>
  <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;color:#0f172a;">Hola${params.adminNombre ? `, ${params.adminNombre}` : ''}!</h1>
  <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">El equipo de <strong>ActivaQR</strong> está solicitando acceso remoto a los activos de <strong style="color:#0f172a;">${params.empresaNombre}</strong> para brindarte soporte técnico.</p>
  ${costoTexto}
  <p style="margin:0 0 8px;font-size:14px;color:#475569;">Si aprobás el acceso, el equipo de soporte podrá <strong>ver tus activos, mediciones y comunicarse con vos</strong> directamente desde la plataforma.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td>
    <a href="${params.linkAprobacion}" style="display:inline-block;background:#f97316;color:#fff;font-size:15px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;padding:14px 28px;border:3px solid #0f172a;box-shadow:4px 4px 0px #0f172a;">
      Aprobar acceso →
    </a>
  </td></tr></table>
  <p style="margin:0;font-size:12px;color:#94a3b8;">Si no solicitaste soporte, ignorá este email. Podés revocar el acceso en cualquier momento desde Configuración → Acceso remoto.</p>
</td></tr>
<tr><td style="background:#0f172a;padding:16px 32px;border:3px solid #0f172a;border-top:none;">
  <p style="margin:0;font-size:11px;color:#475569;text-align:center;">© ${new Date().getFullYear()} ActivaQR</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
  });
}
