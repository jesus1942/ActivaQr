/**
 * Politicas de Uso y de Privacidad de ActivaQR.
 *
 * Se sirven como paginas HTML publicas en /politica-uso y /politica-privacidad.
 * La aceptacion del cliente queda registrada en Empresa (campos
 * politicasAceptadasEn, politicasAceptadasIp, politicasVersion).
 *
 * Cada vez que el texto cambie de forma material, subir POLITICAS_VERSION
 * para forzar una re-aceptacion en el siguiente login del admin.
 */

export const POLITICAS_VERSION = '2026-06-04';

const ESTILOS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0f172a;background:#f1f5f9;line-height:1.6}
  .wrap{max-width:780px;margin:0 auto;padding:0 20px}
  nav{background:#0f172a;border-bottom:3px solid #0f172a;position:sticky;top:0;z-index:50}
  nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
  nav .brand{font-weight:900;color:#f97316;text-transform:uppercase;letter-spacing:2px;font-size:22px}
  nav a.volver{color:#94a3b8;text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
  nav a.volver:hover{color:#fff}
  header{background:#fff;padding:48px 0 24px;border-bottom:3px solid #0f172a}
  header .tag{display:inline-block;background:#fff7ed;border:2px solid #f97316;color:#ea580c;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;margin-bottom:18px}
  header h1{font-size:clamp(28px,5vw,42px);font-weight:900;text-transform:uppercase;letter-spacing:-.5px;line-height:1.1;margin-bottom:10px}
  header .meta{color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px}
  main{background:#fff;padding:32px 0 56px;border-bottom:3px solid #0f172a}
  main .wrap{max-width:780px}
  main h2{font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-.3px;margin:32px 0 12px;border-left:6px solid #f97316;padding-left:14px}
  main h3{font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;margin:22px 0 8px;color:#0f172a}
  main p{margin-bottom:14px;color:#334155;font-size:15px}
  main ul{margin:0 0 16px 20px;color:#334155;font-size:15px}
  main li{margin-bottom:6px}
  main strong{color:#0f172a}
  main code{background:#f1f5f9;border:1px solid #cbd5e1;padding:1px 6px;font-family:monospace;font-size:13px}
  .info-box{background:#fff7ed;border:2px solid #f97316;padding:18px 20px;margin:18px 0;font-size:14px;color:#7c2d12}
  .info-box strong{color:#7c2d12}
  footer{background:#0f172a;color:#94a3b8;padding:32px 0;text-align:center;font-size:13px}
  footer .brand{font-weight:900;color:#f97316;font-size:18px;text-transform:uppercase;letter-spacing:2px;display:block;margin-bottom:8px}
  footer a{color:#f97316;text-decoration:none;font-weight:700}

  /* ===== TEMA OSCURO / TURQUESA (override del mockup) ===== */
  html{background:#0B1120}
  body{color:#E6EAF2;background:#0B1120}
  nav{background:rgba(11,17,32,.7);backdrop-filter:blur(14px);border-bottom:1px solid #26303f}
  nav .brand{color:#2DD4BF}
  nav a.volver{color:#9CA7BA}
  nav a.volver:hover{color:#2DD4BF}
  header{background:transparent;border-bottom:1px solid #26303f}
  header .tag{background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.4);color:#2DD4BF}
  header .meta{color:#9CA7BA}
  main{background:transparent;border-bottom:1px solid #26303f}
  main h2{border-left:4px solid #2DD4BF;color:#E6EAF2}
  main h3{color:#E6EAF2}
  main p,main ul{color:#9CA7BA}
  main strong{color:#E6EAF2}
  main code{background:rgba(20,24,34,.7);border:1px solid #26303f;color:#E6EAF2}
  .info-box{background:rgba(45,212,191,.08);border:1px solid rgba(45,212,191,.35);color:#cfe9e4}
  .info-box strong{color:#E6EAF2}
  footer{background:transparent;border-top:1px solid #26303f;color:#9CA7BA}
  footer .brand{color:#2DD4BF}
  footer a{color:#2DD4BF}
`;

function navHtml(): string {
  return `<nav>
  <div class="wrap">
    <span class="brand">ActivaQR</span>
    <a class="volver" href="/">&larr; Volver al inicio</a>
  </div>
</nav>`;
}

function footerHtml(appUrl: string): string {
  return `<footer>
  <div class="wrap">
    <span class="brand">ActivaQR</span>
    Gesti&oacute;n de activos industriales con QR. Hecho en Argentina.
    <div style="margin-top:8px">
      <a href="/politica-uso">Pol&iacute;tica de Uso</a> &middot;
      <a href="/politica-privacidad">Pol&iacute;tica de Privacidad</a> &middot;
      <a href="${appUrl}">Ingresar a la app</a>
    </div>
    <div style="margin-top:8px;color:#475569;font-size:11px">Versi&oacute;n vigente: ${POLITICAS_VERSION}</div>
  </div>
</footer>`;
}

export function renderPoliticaUso(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Pol&iacute;tica de Uso &mdash; ActivaQR</title>
<meta name="description" content="T&eacute;rminos y condiciones de uso del servicio ActivaQR." />
<style>${ESTILOS}</style>
</head>
<body>

${navHtml()}

<header>
  <div class="wrap">
    <span class="tag">Documento legal</span>
    <h1>Pol&iacute;tica de Uso</h1>
    <p class="meta">Versi&oacute;n ${POLITICAS_VERSION} &middot; Vigente desde el 4 de junio de 2026</p>
  </div>
</header>

<main>
  <div class="wrap">

    <p>Bienvenido a <strong>ActivaQR</strong>. Estas condiciones regulan el uso de la plataforma de gesti&oacute;n de activos industriales operada por el titular del proyecto (en adelante, &laquo;ActivaQR&raquo;, &laquo;nosotros&raquo;). Al crear una cuenta, contratar un plan o utilizar la aplicaci&oacute;n, el usuario (en adelante, &laquo;el Cliente&raquo;) declara haber le&iacute;do, comprendido y aceptado esta Pol&iacute;tica de Uso y la Pol&iacute;tica de Privacidad asociada.</p>

    <h2>1. Identificaci&oacute;n del prestador</h2>
    <p>ActivaQR es un servicio de software como servicio (SaaS) desarrollado y operado desde la Provincia de Neuqu&eacute;n, Rep&uacute;blica Argentina. Para todas las cuestiones legales y de contacto, el correo electr&oacute;nico oficial es <strong>chucky9425@gmail.com</strong>.</p>

    <h2>2. Objeto del servicio</h2>
    <p>ActivaQR brinda una plataforma web y m&oacute;vil que permite al Cliente:</p>
    <ul>
      <li>Registrar y administrar un inventario de activos industriales (equipos, m&aacute;quinas, herramientas).</li>
      <li>Generar c&oacute;digos QR &uacute;nicos para cada activo y exponer una ficha t&eacute;cnica p&uacute;blica.</li>
      <li>Cargar mediciones, programar mantenimientos y recibir alertas autom&aacute;ticas seg&uacute;n umbrales configurados.</li>
      <li>Gestionar t&eacute;cnicos, sedes, sectores y reportes operativos.</li>
      <li>Acceder a soporte remoto en los planes que lo incluyan.</li>
    </ul>

    <h2>3. Periodo de prueba gratuito</h2>
    <div class="info-box">
      <strong>Trial de 30 d&iacute;as.</strong> Al crearse una cuenta nueva, el Cliente dispone de un per&iacute;odo de prueba gratuito de <strong>treinta (30) d&iacute;as corridos</strong> contados desde la fecha de alta de la empresa en el sistema. Durante ese plazo no se efect&uacute;a cobro alguno. Al finalizar, si el Cliente no adhiere una suscripci&oacute;n activa por Mercado Pago, ActivaQR suspender&aacute; el acceso a la plataforma hasta que se regularice el pago.
    </div>
    <p>El per&iacute;odo de prueba se otorga una sola vez por organizaci&oacute;n. ActivaQR se reserva el derecho de denegar nuevos trials a empresas que ya hayan utilizado uno previamente, est&eacute;n vinculadas a deudas o hayan incurrido en usos contrarios a esta pol&iacute;tica.</p>

    <h2>4. Aceptaci&oacute;n previa al pago</h2>
    <p>La aceptaci&oacute;n expresa de esta Pol&iacute;tica de Uso y de la Pol&iacute;tica de Privacidad es <strong>requisito obligatorio</strong> para que ActivaQR genere el enlace de adhesi&oacute;n a la suscripci&oacute;n recurrente en Mercado Pago. Sin esa aceptaci&oacute;n, no podr&aacute; concretarse el pago ni continuar utilizando la plataforma m&aacute;s all&aacute; del per&iacute;odo de prueba.</p>
    <p>La aceptaci&oacute;n queda registrada en nuestros sistemas con la fecha, hora, direcci&oacute;n IP de origen y la versi&oacute;n del documento vigente al momento del consentimiento. Esa constancia ser&aacute; v&aacute;lida como prueba en caso de controversia.</p>

    <h2>5. Planes, precios y suscripci&oacute;n</h2>
    <p>ActivaQR ofrece distintos planes (Inicial, Empresa, Industrial) con diferentes l&iacute;mites de activos, t&eacute;cnicos y funcionalidades. Los precios vigentes se comunican durante el proceso de contrataci&oacute;n y pueden actualizarse con notificaci&oacute;n previa por correo electr&oacute;nico al admin de la cuenta.</p>
    <p>El cobro se realiza mensualmente mediante d&eacute;bito autom&aacute;tico a trav&eacute;s de <strong>Mercado Pago</strong> (en pesos argentinos) o <strong>Stripe</strong> (en d&oacute;lares y otras monedas). ActivaQR no almacena datos de tarjetas ni de cuentas bancarias del Cliente: la informaci&oacute;n financiera se procesa exclusivamente en los sistemas de esos procesadores, sujetos a sus propias pol&iacute;ticas.</p>

    <h2>6. Cuentas, roles y responsabilidad del Cliente</h2>
    <p>El Cliente designa un administrador principal de la cuenta y es responsable de la confidencialidad de las credenciales de acceso. Toda actividad realizada con esas credenciales se imputa al Cliente. El Cliente se obliga a:</p>
    <ul>
      <li>Mantener actualizada la informaci&oacute;n de contacto y los datos cargados en la plataforma.</li>
      <li>Asegurar que cada usuario interno utilice credenciales individuales y no las comparta.</li>
      <li>Notificar de inmediato cualquier sospecha de uso indebido al correo <strong>chucky9425@gmail.com</strong>.</li>
      <li>Cumplir con la normativa local aplicable a la operaci&oacute;n industrial donde se utilice la plataforma.</li>
    </ul>

    <h2>7. Usos permitidos y prohibidos</h2>
    <p>El Cliente puede utilizar ActivaQR exclusivamente para los fines descriptos en el art&iacute;culo 2. Queda expresamente prohibido:</p>
    <ul>
      <li>Utilizar la plataforma para actividades il&iacute;citas, fraudulentas o contrarias a la moral o las buenas costumbres.</li>
      <li>Cargar datos personales de terceros sin contar con su consentimiento o sin base legal habilitante.</li>
      <li>Realizar ingenier&iacute;a inversa, descompilar, copiar o redistribuir el c&oacute;digo o la interfaz de la plataforma.</li>
      <li>Intentar acceder a datos de otras empresas, eludir mecanismos de seguridad o sobrecargar deliberadamente la infraestructura.</li>
      <li>Revender o sublicenciar el servicio sin autorizaci&oacute;n escrita previa.</li>
    </ul>

    <h2>8. Soporte remoto y consentimiento</h2>
    <p>Los planes Empresa e Industrial incluyen la posibilidad de habilitar &laquo;soporte remoto&raquo;: el equipo de ActivaQR puede acceder a los activos y mediciones del Cliente y comunicarse a trav&eacute;s del chat interno. Este acceso requiere <strong>consentimiento expreso e individualizado del Cliente</strong> para cada solicitud, puede revocarse en cualquier momento y siempre queda registrado.</p>

    <h2>9. Disponibilidad del servicio</h2>
    <p>ActivaQR realiza esfuerzos razonables para mantener la plataforma disponible 24/7, pero <strong>no garantiza una disponibilidad ininterrumpida</strong>. Pueden ocurrir tareas de mantenimiento programadas, fallas de proveedores de infraestructura (Railway, GitHub Pages, Mercado Pago, Stripe, Resend, Telegram) o interrupciones de fuerza mayor. ActivaQR no responde por lucro cesante derivado de indisponibilidad del servicio.</p>

    <h2>10. Suspensi&oacute;n y cancelaci&oacute;n</h2>
    <p>ActivaQR puede suspender o cancelar la cuenta del Cliente, con notificaci&oacute;n previa cuando sea razonable, en los siguientes casos:</p>
    <ul>
      <li>Falta de pago al vencer el per&iacute;odo de prueba o al rechazarse un d&eacute;bito autom&aacute;tico.</li>
      <li>Incumplimiento de cualquier cl&aacute;usula de esta Pol&iacute;tica de Uso.</li>
      <li>Uso de la plataforma para actividades il&iacute;citas o que pongan en riesgo la integridad del sistema o de otros clientes.</li>
    </ul>
    <p>El Cliente puede cancelar su suscripci&oacute;n en cualquier momento desde su panel de Configuraci&oacute;n. La cancelaci&oacute;n detiene los d&eacute;bitos futuros en el siguiente ciclo. ActivaQR no realiza reintegros proporcionales de mensualidades ya cobradas, salvo disposici&oacute;n legal en contrario.</p>

    <h2>11. Propiedad intelectual</h2>
    <p>El software, c&oacute;digo, dise&ntilde;os, marcas, logos y dem&aacute;s elementos de la plataforma son propiedad exclusiva de ActivaQR. Los datos cargados por el Cliente (activos, mediciones, fotograf&iacute;as, etc.) permanecen siendo propiedad del Cliente. El Cliente otorga a ActivaQR una licencia limitada para procesar esos datos con el solo fin de prestar el servicio.</p>

    <h2>12. Limitaci&oacute;n de responsabilidad</h2>
    <p>ActivaQR es una herramienta de apoyo a la gesti&oacute;n del mantenimiento. <strong>Las decisiones operativas, t&eacute;cnicas y de seguridad sobre los activos del Cliente son responsabilidad exclusiva del Cliente</strong>. ActivaQR no responde por da&ntilde;os derivados de mediciones mal cargadas, umbrales mal configurados, alertas no atendidas o fallas operativas no relacionadas con el software.</p>
    <p>En ning&uacute;n caso la responsabilidad total acumulada de ActivaQR frente al Cliente superar&aacute; el importe equivalente a las &uacute;ltimas tres (3) mensualidades efectivamente pagadas por el Cliente.</p>

    <h2>13. Modificaciones</h2>
    <p>ActivaQR puede modificar esta Pol&iacute;tica de Uso en cualquier momento. Las modificaciones materiales se comunicar&aacute;n al admin de la cuenta por correo electr&oacute;nico y se publicar&aacute;n en esta misma p&aacute;gina con un n&uacute;mero de versi&oacute;n actualizado. Si la modificaci&oacute;n es material, se solicitar&aacute; una nueva aceptaci&oacute;n al Cliente en el siguiente ingreso a la plataforma.</p>

    <h2>14. Ley aplicable y jurisdicci&oacute;n</h2>
    <p>Esta Pol&iacute;tica de Uso se rige por las leyes de la <strong>Rep&uacute;blica Argentina</strong>. Toda controversia que no pueda resolverse de manera amigable ser&aacute; sometida a la jurisdicci&oacute;n de los tribunales ordinarios con asiento en la Ciudad de Neuqu&eacute;n, Provincia de Neuqu&eacute;n, renunciando las partes a cualquier otro fuero o jurisdicci&oacute;n que pudiera corresponderles.</p>

    <h2>15. Contacto</h2>
    <p>Para consultas, reclamos o ejercicio de derechos, escribir a <strong>chucky9425@gmail.com</strong>.</p>

  </div>
</main>

${footerHtml(appUrl)}

</body>
</html>`;
}

export function renderPoliticaPrivacidad(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Pol&iacute;tica de Privacidad &mdash; ActivaQR</title>
<meta name="description" content="C&oacute;mo ActivaQR trata los datos personales del Cliente, conforme a la Ley 25.326 de la Rep&uacute;blica Argentina." />
<style>${ESTILOS}</style>
</head>
<body>

${navHtml()}

<header>
  <div class="wrap">
    <span class="tag">Documento legal</span>
    <h1>Pol&iacute;tica de Privacidad</h1>
    <p class="meta">Versi&oacute;n ${POLITICAS_VERSION} &middot; Vigente desde el 4 de junio de 2026</p>
  </div>
</header>

<main>
  <div class="wrap">

    <p>Esta Pol&iacute;tica de Privacidad describe c&oacute;mo <strong>ActivaQR</strong> recolecta, utiliza, almacena y protege los datos personales que trata en el marco de la prestaci&oacute;n del servicio. Se ajusta a la <strong>Ley 25.326 de Protecci&oacute;n de los Datos Personales</strong> de la Rep&uacute;blica Argentina y su reglamentaci&oacute;n vigente.</p>

    <h2>1. Responsable del tratamiento</h2>
    <p>El responsable del tratamiento de los datos personales recolectados a trav&eacute;s de la plataforma es el titular del proyecto ActivaQR, con domicilio en la Provincia de Neuqu&eacute;n, Rep&uacute;blica Argentina, contactable al correo <strong>chucky9425@gmail.com</strong>.</p>

    <h2>2. Datos que recolectamos</h2>

    <h3>2.1. Datos del titular de la cuenta y usuarios internos</h3>
    <ul>
      <li>Nombre y apellido, correo electr&oacute;nico, tel&eacute;fono y rol asignado.</li>
      <li>Contrase&ntilde;a (almacenada en formato <em>hash</em> con bcrypt, nunca en texto plano).</li>
      <li>Datos de la empresa: raz&oacute;n social, CUIT, logo opcional.</li>
      <li>Registros de acceso: fecha y hora del &uacute;ltimo ingreso.</li>
      <li>Opcionalmente, identificador de chat de Telegram si el Cliente lo vincula para recuperaci&oacute;n de contrase&ntilde;a.</li>
    </ul>

    <h3>2.2. Datos operativos cargados por el Cliente</h3>
    <ul>
      <li>Inventario de activos: c&oacute;digo, nombre, marca, modelo, ubicaci&oacute;n, par&aacute;metros t&eacute;cnicos.</li>
      <li>Mediciones, observaciones, fotograf&iacute;as y audios cargados por t&eacute;cnicos.</li>
      <li>Datos de t&eacute;cnicos y operadores asignados (nombre, email, tel&eacute;fono, cargo).</li>
    </ul>

    <h3>2.3. Datos de uso y t&eacute;cnicos</h3>
    <ul>
      <li>Direcci&oacute;n IP de origen, navegador y sistema operativo (registro de auditor&iacute;a).</li>
      <li>P&aacute;ginas visitadas dentro de la plataforma y eventos de la API.</li>
      <li>Suscripci&oacute;n a notificaciones push del navegador, si el usuario la habilit&oacute;.</li>
    </ul>

    <h3>2.4. Datos de pago</h3>
    <p>ActivaQR <strong>no almacena</strong> n&uacute;meros de tarjetas, c&oacute;digos de seguridad ni datos de cuentas bancarias. El procesamiento de pagos se realiza ntegramente en <strong>Mercado Pago</strong> y <strong>Stripe</strong>, que act&uacute;an como encargados del tratamiento de esos datos bajo sus propias pol&iacute;ticas. Nuestro sistema solamente almacena el identificador del &laquo;preapproval&raquo; o la suscripci&oacute;n correspondiente, el estado y el monto.</p>

    <h2>3. Finalidades del tratamiento</h2>
    <p>Tratamos los datos personales con las siguientes finalidades:</p>
    <ul>
      <li>Prestar el servicio contratado: autenticaci&oacute;n, gesti&oacute;n de activos, alertas y soporte.</li>
      <li>Procesar el cobro de la suscripci&oacute;n a trav&eacute;s de Mercado Pago o Stripe.</li>
      <li>Enviar notificaciones operativas relacionadas con la cuenta (avisos de pago, alertas, recuperaci&oacute;n de contrase&ntilde;a por email o Telegram).</li>
      <li>Mejorar la plataforma: m&eacute;tricas de uso agregadas, depuraci&oacute;n de errores.</li>
      <li>Cumplir obligaciones legales y responder requerimientos de autoridades competentes.</li>
    </ul>

    <h2>4. Base legal del tratamiento</h2>
    <ul>
      <li><strong>Ejecuci&oacute;n del contrato</strong>: para todos los tratamientos imprescindibles para prestar el servicio.</li>
      <li><strong>Consentimiento del Cliente</strong>: para finalidades adicionales, como notificaciones push, vinculaci&oacute;n con Telegram o el soporte remoto.</li>
      <li><strong>Inter&eacute;s leg&iacute;timo</strong>: para registros m&iacute;nimos de auditor&iacute;a y seguridad.</li>
      <li><strong>Cumplimiento de obligaciones legales</strong>: cuando una norma lo exija.</li>
    </ul>

    <h2>5. Destinatarios y encargados del tratamiento</h2>
    <p>ActivaQR comparte datos personales &uacute;nicamente con los proveedores estrictamente necesarios para prestar el servicio:</p>
    <ul>
      <li><strong>Railway</strong> (hosting del backend y la base de datos PostgreSQL).</li>
      <li><strong>GitHub Pages</strong> (hosting de la aplicaci&oacute;n web del Cliente).</li>
      <li><strong>Mercado Pago</strong> y <strong>Stripe</strong> (procesamiento de cobros y suscripciones recurrentes).</li>
      <li><strong>Resend</strong> (env&iacute;o de correos transaccionales).</li>
      <li><strong>Telegram</strong> (env&iacute;o opcional de mensajes de recuperaci&oacute;n de contrase&ntilde;a).</li>
      <li><strong>Proveedores de servicios push</strong> de los navegadores (Web Push API).</li>
    </ul>
    <p>Cada uno de estos proveedores act&uacute;a como encargado del tratamiento y est&aacute; obligado a respetar las medidas de seguridad apropiadas y a tratar los datos solo bajo nuestras instrucciones.</p>
    <p>ActivaQR <strong>no vende ni cede los datos personales del Cliente a terceros</strong> con fines comerciales o publicitarios.</p>

    <h2>6. Transferencia internacional</h2>
    <p>Algunos proveedores listados arriba pueden almacenar datos en servidores ubicados fuera de la Rep&uacute;blica Argentina. Esas transferencias se realizan en pa&iacute;ses considerados adecuados o con cl&aacute;usulas contractuales que garantizan un nivel de protecci&oacute;n equivalente al exigido por la Ley 25.326.</p>

    <h2>7. Conservaci&oacute;n de los datos</h2>
    <p>Los datos del Cliente se conservan mientras la cuenta est&eacute; activa y hasta cinco (5) a&ntilde;os despu&eacute;s de su cancelaci&oacute;n, salvo que normas fiscales, contables o probatorias exijan un plazo mayor. Los registros financieros vinculados a Mercado Pago o Stripe se conservan por el plazo de prescripci&oacute;n legal correspondiente.</p>
    <p>El Cliente puede solicitar la eliminaci&oacute;n anticipada de sus datos, con las limitaciones previstas por la normativa aplicable.</p>

    <h2>8. Derechos del titular de los datos</h2>
    <p>De conformidad con la Ley 25.326, el titular de los datos personales tiene derecho a:</p>
    <ul>
      <li>Acceder de forma gratuita a los datos que ActivaQR trate sobre &eacute;l, con intervalo m&iacute;nimo de seis (6) meses, salvo inter&eacute;s leg&iacute;timo.</li>
      <li>Solicitar la rectificaci&oacute;n, actualizaci&oacute;n o supresi&oacute;n de los datos inexactos, desactualizados o tratados de forma il&iacute;cita.</li>
      <li>Oponerse al tratamiento de los datos para finalidades no esenciales.</li>
      <li>Revocar el consentimiento prestado, sin efecto retroactivo.</li>
    </ul>
    <p>Para ejercer estos derechos, enviar una solicitud al correo <strong>chucky9425@gmail.com</strong> indicando la operaci&oacute;n requerida y acompa&ntilde;ando una identificaci&oacute;n razonable. Responderemos dentro de los plazos legales.</p>
    <p>El titular puede tambi&eacute;n presentar reclamos ante la <strong>Agencia de Acceso a la Informaci&oacute;n P&uacute;blica</strong>, autoridad de aplicaci&oacute;n de la Ley 25.326 en la Rep&uacute;blica Argentina.</p>

    <h2>9. Seguridad</h2>
    <p>ActivaQR aplica medidas t&eacute;cnicas y organizativas razonables para proteger los datos personales contra accesos no autorizados, p&eacute;rdidas, alteraciones o destrucciones, entre ellas:</p>
    <ul>
      <li>Cifrado de las comunicaciones (HTTPS/TLS) en toda la plataforma.</li>
      <li>Almacenamiento de contrase&ntilde;as con hashing bcrypt.</li>
      <li>Autenticaci&oacute;n basada en tokens JWT con vencimiento.</li>
      <li>Aislamiento multi-tenant: cada empresa solo accede a sus propios datos.</li>
      <li>L&iacute;mites de tasa (rate limiting) en operaciones sensibles.</li>
      <li>Copias de seguridad gestionadas por el proveedor de base de datos.</li>
    </ul>
    <p>Ning&uacute;n sistema es absolutamente impenetrable. En caso de incidente de seguridad relevante, ActivaQR lo notificar&aacute; al admin de la cuenta afectada y, cuando corresponda, a la autoridad de aplicaci&oacute;n.</p>

    <h2>10. Cookies y almacenamiento local</h2>
    <p>ActivaQR utiliza almacenamiento de sesi&oacute;n del navegador (<code>sessionStorage</code>) para conservar el token JWT mientras dure la sesi&oacute;n y almacenamiento local (<code>localStorage</code>) para guardar preferencias del Cliente y cachear datos operativos. No utilizamos cookies de seguimiento publicitario ni compartimos identificadores con redes de terceros.</p>

    <h2>11. Menores de edad</h2>
    <p>ActivaQR est&aacute; dirigido a empresas y profesionales. No recolectamos a sabiendas datos personales de menores de 16 a&ntilde;os. Si tom&aacute;ramos conocimiento de un tratamiento as&iacute;, lo eliminaremos.</p>

    <h2>12. Modificaciones</h2>
    <p>ActivaQR puede actualizar esta Pol&iacute;tica de Privacidad. Las modificaciones materiales se comunicar&aacute;n al admin de la cuenta por correo electr&oacute;nico y se publicar&aacute;n en esta p&aacute;gina con una nueva versi&oacute;n. Cuando corresponda, solicitaremos al Cliente una nueva aceptaci&oacute;n antes de continuar utilizando la plataforma.</p>

    <h2>13. Contacto</h2>
    <p>Para consultas relacionadas con esta Pol&iacute;tica de Privacidad o con el tratamiento de datos personales, escribir a <strong>chucky9425@gmail.com</strong>.</p>

  </div>
</main>

${footerHtml(appUrl)}

</body>
</html>`;
}
