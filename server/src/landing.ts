/**
 * Landing page pública de ActivaQR, servida por el backend en la raíz "/".
 * Estilo neo-brutalista: bordes gruesos, sombras duras, naranja/negro/blanco.
 * Sin emojis. El formulario de contacto postea a /api/leads.
 */

import { PLANES, PLAN_IDS, type PlanId } from './planCatalog';
import { renderBitacoraPreview } from './bitacora';

const BENEFICIOS_PLAN: Record<PlanId, string[]> = {
  inicial: [
    'Mediciones y mantenimientos',
    'Alertas automáticas',
    'Reportes en PDF',
  ],
  empresa: [
    'Ficha QR pública siempre activa',
    'Soporte remoto incluido',
    'Sectores e importación CSV',
  ],
  industrial: [
    'Técnicos ilimitados',
    'Soporte prioritario',
    'Todo lo de Empresa',
    'Acompañamiento dedicado',
  ],
};

function renderPlanes(appUrl: string): string {
  return PLAN_IDS.map((plan) => {
    const config = PLANES[plan];
    const equipos = plan === 'industrial'
      ? `Hasta ${config.activosIncluidos} equipos incluidos`
      : `Hasta ${config.activosIncluidos} equipos`;
    const usuarios = config.usuariosMaximos
      ? `${config.usuariosMaximos} ${plan === 'inicial' ? 'usuarios' : 'técnicos'}`
      : '';
    const recargo = config.recargoPorBloqueUsd && config.tamanoBloqueExtra
      ? `+USD ${config.recargoPorBloqueUsd} cada ${config.tamanoBloqueExtra} equipos adicionales`
      : '';
    const items = [equipos, recargo, usuarios, ...BENEFICIOS_PLAN[plan]]
      .filter(Boolean)
      .map((item) => `<li>${item}</li>`)
      .join('');
    const clase = plan === 'empresa' ? 'plan destacado' : 'plan';
    const boton = plan === 'empresa' ? 'btn btn-naranja' : 'btn btn-negro';

    return `<div class="${clase}">
        <h3>${config.nombre}</h3>
        <p class="precio"><span style="font-size:34px;letter-spacing:0">USD ${config.precioReferenciaUsd}</span> <span style="font-size:13px;font-weight:700;text-transform:none;letter-spacing:0">/ mes</span></p>
        <ul>${items}</ul>
        <a class="${boton}" href="${appUrl}#/login?registro=1&plan=${plan}" target="_blank" rel="noopener">Empezar gratis</a>
      </div>`;
  }).join('');
}

export function renderLanding(
  appUrl: string,
  whatsapp?: string,
  apoyo?: { cafecito?: string; mp?: string; stripe?: string },
): string {
  // whatsapp: numero en formato internacional sin signos (ej: 5491112345678)
  const wa = (whatsapp || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent('Hola! Vi ActivaQR y quiero conocer mas sobre la app.');
  const botonWhatsapp = wa
    ? `<a class="btn btn-negro" href="https://wa.me/${wa}?text=${waMsg}" target="_blank" rel="noopener">Escribinos por WhatsApp</a>`
    : '';

  // Botones de apoyo economico. Cada uno solo aparece si su link esta
  // configurado por env. Si ninguno lo esta, la seccion no se renderiza.
  const ap = apoyo || {};
  const botonApoyo = (href: string, bg: string, titulo: string, sub: string) =>
    `<a class="apoyo-btn" href="${href}" target="_blank" rel="noopener" style="--ab:${bg}">
       <span class="apoyo-tit">${titulo}</span>
       <span class="apoyo-sub">${sub}</span>
     </a>`;
  const botonesApoyo = [
    ap.cafecito ? botonApoyo(ap.cafecito, '#8a5a18', 'Invitame un cafe', 'Cafecito &middot; ARS, simple y rapido') : '',
    ap.mp ? botonApoyo(ap.mp, '#0c84cc', 'Mercado Pago', 'Monto a eleccion &middot; ARS') : '',
    ap.stripe ? botonApoyo(ap.stripe, '#7c3aed', 'Stripe', 'Aporte internacional &middot; USD') : '',
  ].join('');
  const seccionApoyo = (ap.cafecito || ap.mp || ap.stripe)
    ? `<section id="apoyo" class="reveal" style="background:#fff;border-top:3px solid var(--negro)">
  <div class="wrap" style="max-width:760px">
    <h2 class="titulo">Apoy&aacute; el proyecto</h2>
    <p class="bajada">ActivaQR lo construye una persona, Jes&uacute;s, desde Puerto Madryn, Chubut. Cada aporte ayuda a que pueda seguir mejorando la herramienta y mantenerla accesible para las PYMES que la necesitan.</p>
    <div class="apoyo-grid">${botonesApoyo}</div>
    <p style="font-size:13px;color:var(--gris-c);margin-top:20px">Si quer&eacute;s apoyar de otra manera (experiencia, contactos, feedback t&eacute;cnico), dej&aacute; tu testimonio aqu&iacute; arriba o escribinos por WhatsApp.</p>
  </div>
</section>`
    : '';
  const planes = renderPlanes(appUrl);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- SEO primario -->
<title>ActivaQR — Mantenimiento que llega hasta el campo</title>
<meta name="description" content="El técnico escanea el QR, carga la medición y la foto desde el celular. Funciona sin señal: queda guardado y se sincroniza cuando vuelve la conexión. Para contratistas y empresas de servicios que necesitan que el trabajo del campo llegue ordenado al cliente." />
<meta name="keywords" content="mantenimiento industrial, gestion de activos con QR, CMMS para contratistas, mantenimiento Vaca Muerta, O&M aerogeneradores Patagonia, software mantenimiento offline, planilla digital de mantenimiento" />
<meta name="author" content="ActivaQR" />
<link rel="canonical" href="https://activaqr.net/" />

<!-- Open Graph (WhatsApp, LinkedIn, Facebook) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://activaqr.net/" />
<meta property="og:title" content="ActivaQR — Mantenimiento que llega hasta el campo" />
<meta property="og:description" content="Tu técnico escanea el QR, carga la medición y la foto desde el celular. Si no hay señal, queda guardado y sube solo cuando vuelve la conexión." />
<meta property="og:image" content="https://activaqr.net/company-logo-hd.png" />
<meta property="og:locale" content="es_AR" />
<meta property="og:site_name" content="ActivaQR" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="ActivaQR — Mantenimiento que llega hasta el campo" />
<meta name="twitter:description" content="Pensado para empresas de servicios y mantenimiento. Funciona en el pad sin señal, en la mina, en la góndola del aerogenerador." />
<meta name="twitter:image" content="https://activaqr.net/company-logo-hd.png" />

<!-- Schema.org: SoftwareApplication -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ActivaQR",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Sistema SaaS de gestión de activos industriales con códigos QR. Mantenimiento preventivo y predictivo, alertas automáticas, historial digitalizado y soporte remoto.",
  "url": "https://activaqr.net/",
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "USD",
    "lowPrice": "${PLANES.inicial.precioReferenciaUsd}",
    "highPrice": "${PLANES.industrial.precioReferenciaUsd}",
    "offerCount": "3"
  },
  "provider": {
    "@type": "Person",
    "name": "Jesús Narciso Olguín",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Puerto Madryn",
      "addressRegion": "Chubut",
      "addressCountry": "AR"
    }
  },
  "areaServed": [
    { "@type": "City", "name": "Puerto Madryn" },
    { "@type": "AdministrativeArea", "name": "Chubut" },
    { "@type": "Country", "name": "Argentina" }
  ]
}
</script>

<link rel="icon" type="image/png" href="https://activaqr.net/favicon.png" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--naranja:#f97316;--negro:#0f172a;--gris:#475569;--gris-c:#94a3b8;--fondo:#fafafa}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--negro);background:var(--fondo);line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}
  h1,h2,h3{font-weight:800;letter-spacing:-.01em;line-height:1.15}
  .brand{font-weight:900;color:var(--naranja);text-transform:uppercase;letter-spacing:2px}
  a{color:inherit}
  .btn{display:inline-block;font-weight:700;text-decoration:none;padding:13px 22px;border:2px solid var(--negro);box-shadow:3px 3px 0 var(--negro);transition:transform .15s,box-shadow .15s}
  .btn:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--negro)}
  .btn-naranja{background:var(--naranja);color:#fff}
  .btn-negro{background:var(--negro);color:#fff}
  .btn-blanco{background:#fff;color:var(--negro)}

  /* NAV */
  nav{background:var(--negro);border-bottom:3px solid var(--negro);position:sticky;top:0;z-index:50}
  nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
  nav .brand{font-size:22px}
  nav .links{display:flex;gap:8px;align-items:center}
  nav .links a.nav-link{color:var(--gris-c);text-decoration:none;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:8px 10px}
  nav .links a.nav-link:hover{color:#fff}
  nav .btn{padding:9px 16px;box-shadow:3px 3px 0 var(--naranja);font-size:13px}
  nav .btn:hover{box-shadow:4px 4px 0 var(--naranja)}
  @media(max-width:720px){nav .links a.nav-link{display:none}}

  /* ROADMAP */
  .roadmap{background:#fff;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)}
  .roadmap .fase{display:flex;gap:0;flex-direction:column}
  .roadmap .fase-item{display:flex;gap:20px;padding:22px 0;border-bottom:2px solid #e2e8f0;align-items:flex-start}
  .roadmap .fase-item:last-child{border-bottom:none}
  .roadmap .fase-badge{flex-shrink:0;background:var(--negro);color:var(--naranja);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;border:2px solid var(--negro);white-space:nowrap;margin-top:3px}
  .roadmap .fase-badge.activo{background:var(--naranja);color:#fff;border-color:var(--negro)}
  .roadmap .fase-badge.proximo{background:#fff;color:var(--negro);border-color:var(--negro)}
  .roadmap .fase-badge.futuro{background:#f1f5f9;color:var(--gris);border-color:#cbd5e1}
  .roadmap .fase-content h3{font-size:17px;margin-bottom:5px}
  .roadmap .fase-content p{color:var(--gris);font-size:15px;line-height:1.6}
  .capital-banner{background:var(--negro);color:#fff;padding:48px 0;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro);text-align:center}
  .capital-banner h2{font-size:clamp(22px,4vw,36px);color:#fff;margin-bottom:14px}
  .capital-banner p{color:#94a3b8;font-size:16px;max-width:680px;margin:0 auto}

  /* HERO */
  .hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;padding:80px 0 100px;position:relative}
  .hero .tag{display:inline-block;background:#fff7ed;border:1px solid #fdba74;color:#ea580c;font-size:12px;font-weight:600;letter-spacing:.3px;padding:6px 14px;margin-bottom:28px;border-radius:2px}
  .hero h1{font-size:clamp(38px,6.5vw,68px);margin-bottom:26px;line-height:1.05;letter-spacing:-.025em;font-weight:800}
  .hero h1 .o{color:var(--naranja)}
  .hero p.sub{font-size:clamp(17px,2.1vw,20px);color:var(--gris);max-width:620px;margin-bottom:40px;line-height:1.7}
  .hero .acciones{display:flex;gap:14px;flex-wrap:wrap}

  /* HERO — animacion de entrada al cargar */
  @keyframes heroIn{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  .hero .tag{animation:heroIn .5s ease both}
  .hero h1{animation:heroIn .6s .1s ease both}
  .hero p.sub{animation:heroIn .6s .22s ease both}
  .hero .acciones{animation:heroIn .6s .34s ease both}

  /* SCROLL HINT */
  .scroll-hint{position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;opacity:1;transition:opacity .4s}
  .scroll-hint span{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:var(--gris-c)}
  .scroll-arrow{width:28px;height:28px;border-right:3px solid var(--naranja);border-bottom:3px solid var(--naranja);transform:rotate(45deg);animation:bounce 1.4s ease-in-out infinite}
  @keyframes bounce{0%,100%{transform:rotate(45deg) translateY(0)}50%{transform:rotate(45deg) translateY(6px)}}

  /* SECCIONES */
  section{padding:84px 0}
  .titulo{font-size:clamp(26px,3.6vw,38px);margin-bottom:14px;letter-spacing:-.015em}
  .bajada{color:var(--gris);max-width:640px;margin-bottom:40px;font-size:17px;line-height:1.65}

  .grid{display:grid;gap:20px}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g2{grid-template-columns:repeat(2,1fr)}
  @media(max-width:820px){.g3,.g2{grid-template-columns:1fr}}

  .card{background:#fff;border:2px solid var(--negro);box-shadow:3px 3px 0 var(--negro);padding:26px;transition:transform .15s,box-shadow .15s}
  .card:hover{transform:translate(-1px,-1px);box-shadow:4px 4px 0 var(--negro)}
  .card h3{font-size:19px;margin-bottom:10px;font-weight:700}
  .card p{color:var(--gris);font-size:15px;line-height:1.65}
  .card .num{font-size:11px;font-weight:800;color:var(--naranja);letter-spacing:1.5px;text-transform:uppercase}

  /* DIFERENCIAL */
  .dif{background:var(--negro);color:#fff}
  .dif .titulo{color:#fff}
  .dif .bajada{color:var(--gris-c)}
  .dif .card{background:#1e293b;border-color:#334155;box-shadow:none}
  .dif .card:hover{transform:none;box-shadow:none;border-color:var(--naranja)}
  .dif .card h3{color:var(--naranja)}
  .dif .card p{color:#cbd5e1}

  /* CATEGORIAS */
  .chips{display:flex;flex-wrap:wrap;gap:10px}
  .chip{background:#fff;border:2px solid var(--negro);padding:8px 14px;font-weight:700;font-size:14px;box-shadow:3px 3px 0 var(--negro)}

  /* PLANES */
  .planes{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
  @media(max-width:820px){.planes{grid-template-columns:1fr}}
  .plan{background:#fff;border:3px solid var(--negro);box-shadow:6px 6px 0 var(--negro);padding:26px;display:flex;flex-direction:column}
  .plan.destacado{background:var(--negro);color:#fff}
  .plan h3{font-size:24px;margin-bottom:6px}
  .plan .precio{font-size:14px;color:var(--naranja);font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px}
  .plan ul{list-style:none;margin-bottom:24px;flex:1}
  .plan li{padding:7px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:var(--gris)}
  .plan.destacado li{border-color:#334155;color:#cbd5e1}
  .plan .btn{text-align:center}
  @media(max-width:720px){.servicio-grid{grid-template-columns:1fr !important}}

  /* COMO FUNCIONA */
  .pasos{counter-reset:p}
  .paso{display:flex;gap:18px;align-items:flex-start;padding:18px 0;border-bottom:2px solid #e2e8f0}
  .paso .n{flex-shrink:0;width:46px;height:46px;background:var(--naranja);color:#fff;border:3px solid var(--negro);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px}
  .paso h3{font-size:17px;margin-bottom:4px}
  .paso p{color:var(--gris);font-size:15px}

  /* CONTACTO */
  .contacto{background:var(--naranja)}
  .contacto .titulo{color:#fff}
  .contacto .bajada{color:#fff;opacity:.95}
  .form-box{background:#fff;border:2px solid var(--negro);box-shadow:4px 4px 0 var(--negro);padding:30px;max-width:540px}
  .form-box label{display:block;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:5px;margin-top:14px}
  .form-box label:first-child{margin-top:0}
  .form-box input,.form-box textarea{width:100%;border:2px solid #cbd5e1;padding:11px 13px;font-size:15px;font-family:inherit;outline:none}
  .form-box input:focus,.form-box textarea:focus{border-color:var(--naranja)}
  .form-box .btn{width:100%;margin-top:20px;border:none;cursor:pointer;font-family:inherit;font-size:15px}
  .form-msg{margin-top:14px;padding:12px;font-weight:700;font-size:14px;display:none}
  .form-msg.ok{display:block;background:#ecfdf5;border:2px solid #34d399;color:#047857}
  .form-msg.err{display:block;background:#fef2f2;border:2px solid #f87171;color:#b91c1c}

  /* FOOTER */
  .site-footer{position:relative;background:radial-gradient(circle at 68% 54%,rgba(45,212,191,.16),transparent 36%),linear-gradient(180deg,rgba(20,24,34,.88),var(--negro));color:var(--gris-c);padding:48px 0 18px;text-align:left;font-size:13px;overflow:hidden}
  .site-footer::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent 79px,rgba(38,48,63,.38) 80px);pointer-events:none}
  .site-footer .footer-contenido{position:relative}
  .site-footer .footer-superior{display:grid;grid-template-columns:minmax(0,1.4fr) auto;align-items:end;gap:28px;padding-bottom:36px}
  .site-footer .footer-kicker{margin:0 0 10px;color:var(--tealbr);font-weight:700;letter-spacing:.14em;text-transform:uppercase}
  .site-footer .footer-frase{max-width:530px;margin:0;color:var(--text);font-size:clamp(24px,4vw,42px);line-height:1.08;letter-spacing:-.04em;font-weight:700}
  .site-footer .footer-acciones{display:flex;align-items:center;justify-content:flex-end;gap:18px;flex-wrap:wrap}
  .site-footer .footer-enlace{color:var(--gris);text-decoration:none;font-weight:700;transition:color .15s}
  .site-footer .footer-enlace:hover{color:var(--text)}
  .site-footer .footer-app{color:var(--tealbr);text-decoration:none;font-weight:800;padding:11px 16px;border:1px solid rgba(45,212,191,.45);border-radius:10px;transition:color .15s,border-color .15s,box-shadow .15s}
  .site-footer .footer-app:hover{color:#fff;border-color:var(--tealbr);box-shadow:0 0 18px rgba(45,212,191,.2)}
  .site-footer .marca-gigante{display:flex;align-items:baseline;justify-content:center;gap:.14em;width:100%;padding:8px 0 20px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:clamp(58px,15.7vw,176px);line-height:.9;letter-spacing:-.085em;font-weight:900;text-transform:uppercase;white-space:nowrap}
  .site-footer .marca-activa{color:var(--text)}
  .site-footer .marca-qr{color:var(--tealbr);text-shadow:0 0 32px rgba(45,212,191,.4)}
  .site-footer .footer-inferior{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding-top:16px;color:var(--gris)}
  .site-footer .footer-legales{display:flex;gap:18px;flex-wrap:wrap}
  .site-footer .footer-legales a{color:inherit;text-decoration:none;font-weight:600;transition:color .15s}
  .site-footer .footer-legales a:hover{color:var(--text)}
  @media(max-width:620px){
    .site-footer{padding:36px 0 16px}
    .site-footer .footer-superior{grid-template-columns:1fr;align-items:start;padding-bottom:28px}
    .site-footer .footer-acciones{justify-content:flex-start}
    .site-footer .marca-gigante{justify-content:flex-start;gap:.12em}
    .site-footer .footer-inferior{align-items:flex-start;flex-direction:column}
  }

  /* FADE-IN SCROLL */
  .reveal{opacity:0;transform:translateY(32px);transition:opacity .6s ease,transform .6s ease}
  .reveal.visible{opacity:1;transform:translateY(0)}

  /* TESTIMONIOS */
  .testi-card{background:#fff;border:2px solid var(--negro);box-shadow:3px 3px 0 var(--negro);padding:22px;display:flex;flex-direction:column}
  .testi-card.destacado{border-color:var(--naranja);box-shadow:3px 3px 0 var(--naranja)}
  .testi-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:10px}
  .testi-msg{color:var(--negro);font-size:15px;line-height:1.6;white-space:pre-line;flex:1}
  .testi-autor{margin-top:14px;padding-top:14px;border-top:2px dashed #e2e8f0}
  .testi-autor .n{font-weight:800;font-size:14px}
  .testi-autor .r{font-size:12px;color:var(--gris-c);font-family:monospace}
  .testi-empty{background:#fff;border:2px dashed #cbd5e1;padding:28px;text-align:center;color:var(--gris);font-size:15px}
  #testiFormBox label{margin-top:14px}
  #testiFormBox label:first-child{margin-top:0}
  .testi-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:560px){.testi-row{grid-template-columns:1fr}}

  /* APOYO */
  .apoyo-grid{display:flex;flex-direction:column;gap:14px}
  .apoyo-btn{display:flex;flex-direction:column;gap:2px;text-decoration:none;background:var(--ab);color:#fff;padding:16px 20px;border:2px solid var(--negro);box-shadow:4px 4px 0 var(--negro);transition:transform .15s,box-shadow .15s}
  .apoyo-btn:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--negro)}
  .apoyo-tit{font-weight:900;font-size:16px;text-transform:uppercase;letter-spacing:.5px}
  .apoyo-sub{font-size:13px;opacity:.92}

  /* BITACORA */
  .bitacora-preview{border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .bitacora-preview-cabecera{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:30px;margin-bottom:32px}
  .bitacora-preview-cabecera .bajada{margin-bottom:0}
  .bitacora-kicker{margin:0 0 10px;color:var(--tealbr);font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
  .bitacora-preview-grid{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:16px}
  .bitacora-preview-card{padding:24px;border:1px solid var(--line);border-radius:14px;background:var(--surface);backdrop-filter:blur(12px)}
  .bitacora-preview-card.principal{border-color:rgba(45,212,191,.45);box-shadow:0 0 24px rgba(45,212,191,.12)}
  .bitacora-preview-card h3{margin:12px 0 9px;font-size:19px}
  .bitacora-preview-card p{margin:0;color:var(--gris);font-size:14px;line-height:1.6}
  .bitacora-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--gris-c);font-size:10px;text-transform:uppercase;letter-spacing:.07em}
  .bitacora-meta span{color:var(--tealbr);font-weight:900}
  @media(max-width:820px){.bitacora-preview-cabecera{grid-template-columns:1fr;align-items:start}.bitacora-preview-cabecera .btn{width:100%}.bitacora-preview-grid{grid-template-columns:1fr}}
</style>

<!-- ===== TEMA OSCURO / TURQUESA (override del mockup) ===== -->
<style>
  :root{
    --naranja:#14B8A6;--teal:#14B8A6;--tealbr:#2DD4BF;
    --negro:#0B1120;--fondo:#0B1120;
    --gris:#9CA7BA;--gris-c:#6b7790;
    --surface:rgba(20,24,34,.72);--line:#26303f;--text:#E6EAF2;
  }
  body{color:var(--text);background:var(--fondo)}
  h1,h2,h3{color:var(--text)}
  .brand{color:var(--tealbr)}
  /* Fondo aurora (líneas verticales + glow) */
  .aurora{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
  .aurora .g{position:absolute;border-radius:50%;filter:blur(110px)}
  .aurora svg{position:absolute;inset:0;width:100%;height:100%}
  /* Botones */
  .btn{border:1px solid var(--line);box-shadow:none;border-radius:10px}
  .btn:hover{transform:translateY(-1px);box-shadow:0 0 18px rgba(45,212,191,.35)}
  .btn-naranja,.btn-blanco{background:var(--tealbr);color:#06231f;border-color:transparent;box-shadow:0 0 18px rgba(45,212,191,.35)}
  .btn-negro{background:var(--surface);color:var(--text);backdrop-filter:blur(12px)}
  /* Nav */
  nav{background:rgba(11,17,32,.7);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
  nav .links a.nav-link{color:var(--gris)}
  nav .links a.nav-link:hover{color:var(--tealbr)}
  nav .btn,nav .btn:hover{box-shadow:none}
  /* Roadmap / banners */
  .roadmap,.capital-banner,.dif,.contacto,footer{background:transparent;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .roadmap .fase-item{border-bottom:1px solid var(--line)}
  .roadmap .fase-badge{background:var(--surface);color:var(--tealbr);border:1px solid var(--line)}
  .roadmap .fase-badge.activo{background:var(--tealbr);color:#06231f;border-color:transparent}
  .roadmap .fase-badge.proximo{background:var(--surface);color:var(--text);border-color:var(--line)}
  .roadmap .fase-badge.futuro{background:var(--surface);color:var(--gris);border-color:var(--line)}
  .roadmap .fase-content p,.capital-banner p{color:var(--gris)}
  /* Hero */
  .hero .tag{background:rgba(45,212,191,.12);border:1px solid rgba(45,212,191,.4);color:var(--tealbr);border-radius:999px}
  .hero h1 .o{color:var(--tealbr)}
  .hero p.sub,.bajada{color:var(--gris)}
  .scroll-hint span{color:var(--gris)}
  .scroll-arrow{border-color:var(--tealbr)}
  /* Cards */
  .card{background:var(--surface);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:14px}
  .card:hover{transform:translateY(-2px);box-shadow:0 0 22px rgba(45,212,191,.25);border-color:rgba(45,212,191,.4)}
  .card p{color:var(--gris)}
  .card .num{color:var(--tealbr)}
  .dif .card{background:var(--surface);border-color:var(--line)}
  .dif .card h3{color:var(--tealbr)}
  .dif .card p{color:var(--gris)}
  .chip{background:var(--surface);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:none;border-radius:999px;color:var(--text)}
  /* Planes */
  .plan{background:var(--surface);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:16px}
  .plan.destacado{background:linear-gradient(160deg,rgba(20,184,166,.18),var(--surface));border-color:rgba(45,212,191,.45);box-shadow:0 0 26px rgba(45,212,191,.2)}
  .plan .precio{color:var(--tealbr)}
  .plan li{border-bottom:1px solid var(--line);color:var(--gris)}
  /* Pasos */
  .paso{border-bottom:1px solid var(--line)}
  .paso .n{background:var(--tealbr);color:#06231f;border:none;border-radius:12px}
  .paso p{color:var(--gris)}
  /* Contacto / form */
  .contacto .titulo,.contacto .bajada{color:var(--text)}
  .form-box{background:var(--surface);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:16px}
  .form-box label{color:var(--gris)}
  .form-box input,.form-box textarea{background:rgba(9,11,18,.5);border:1px solid var(--line);color:var(--text);border-radius:10px}
  .form-box input:focus,.form-box textarea:focus{border-color:var(--tealbr)}
  .form-msg.ok{background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.5);color:#34d399}
  .form-msg.err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.5);color:#f87171}
  footer{color:var(--gris)}
  /* Testimonios */
  .testi-card{background:var(--surface);backdrop-filter:blur(12px);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.25);border-radius:14px}
  .testi-card.destacado{border-color:rgba(45,212,191,.45);box-shadow:0 0 22px rgba(45,212,191,.2)}
  .testi-badge{color:var(--tealbr)}
  .testi-msg{color:var(--text)}
  .testi-autor{border-top:1px solid var(--line)}
  .testi-autor .r{color:var(--gris-c)}
  .testi-empty{background:var(--surface);border:1px dashed var(--line);color:var(--gris)}
  /* Apoyo */
  .apoyo-btn{border:1px solid var(--line);box-shadow:0 8px 20px rgba(0,0,0,.25);border-radius:12px}
  .apoyo-btn:hover{transform:translateY(-1px);box-shadow:0 0 18px rgba(45,212,191,.25)}
  /* Neutralizar estilos INLINE del HTML viejo (ganan por especificidad -> !important) */
  [style*="background:#fff"],[style*="background:#f8fafc"],[style*="background: #fff"]{background:transparent !important}
  [style*="background:#0f172a"]{background:rgba(20,24,34,.55) !important;backdrop-filter:blur(10px) !important;border-radius:14px}
  [style*="background:#f97316"]{background:var(--tealbr) !important;color:#06231f !important;border-color:transparent !important;box-shadow:0 0 20px rgba(45,212,191,.35) !important}
  [style*="color:#0f172a"],[style*="color:var(--negro)"]{color:var(--text) !important}
  [style*="color:#ea580c"],[style*="color:#f97316"]{color:var(--tealbr) !important}
  [style*="color:#475569"],[style*="color:#64748b"],[style*="color:var(--gris)"]{color:var(--gris) !important}
  [style*="border:3px solid #0f172a"],[style*="border-top:3px solid #0f172a"],[style*="border-bottom:3px solid #0f172a"],[style*="border:3px solid var(--negro)"],[style*="border-top:3px solid var(--negro)"]{border-color:var(--line) !important}
  @media print{.aurora{display:none}}
</style>

<!-- Google Ads (gtag.js) — medicion de campanas. Declarado en la Politica de Privacidad. -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-805828630"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-805828630');
</script>
</head>
<body>

<div class="aurora" aria-hidden="true">
  <div id="auroraInner" style="position:absolute;inset:-20% 0;will-change:transform">
    <div class="g" style="top:-12%;left:55%;width:26vw;height:150vh;background:#14B8A6;opacity:.4"></div>
    <svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%">
      <defs>
        <linearGradient id="lv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2DD4BF" stop-opacity="0"/>
          <stop offset="38%" stop-color="#5EEAD4" stop-opacity="0.7"/>
          <stop offset="72%" stop-color="#22D3EE" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#0FB5A6" stop-opacity="0"/>
        </linearGradient>
        <filter id="lvglow" x="-60%" y="-30%" width="220%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <!-- UNA sola linea ondulada vertical -->
      <path d="M 760 -60 C 930 250, 620 540, 820 810 C 970 1020, 680 1160, 860 1330" stroke="url(#lv)" stroke-width="2.6" fill="none" filter="url(#lvglow)"/>
    </svg>
  </div>
</div>

<nav>
  <div class="wrap">
    <a class="brand" href="#" style="text-decoration:none">ActivaQR</a>
    <div class="links">
      <a class="nav-link" href="#ultimo-km">Por qué</a>
      <a class="nav-link" href="#casos">Para quién</a>
      <a class="nav-link" href="#voces">Voces</a>
      <a class="nav-link" href="/bitacora/">Bit&aacute;cora</a>
      <a class="nav-link" href="#planes">Planes</a>
      <a class="nav-link" href="#servicio">Servicio</a>
      <a class="btn btn-naranja" href="${appUrl}" target="_blank" rel="noopener">Ingresar</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <h1>El mantenimiento se hace<br>donde <span class="o">está el equipo</span>.</h1>
    <p class="sub">Tu técnico escanea el QR del equipo, carga la medición y la foto desde el celular. <strong>Si no hay señal — y en el pad, en el socavón o en la cámara muchas veces no hay — la medición queda en el celular.</strong> Apenas vuelve la conexión, sube sola: con la hora real y la ubicación del momento que se midió.</p>
    <div class="acciones">
      <a class="btn btn-naranja" href="${appUrl}#/login?registro=1" target="_blank" rel="noopener">Probar gratis 30 días</a>
      <a class="btn btn-blanco" href="#contacto">Quiero suscribirme</a>
    </div>
  </div>
  <div class="scroll-hint" id="scrollHint">
    <span>Conocer más</span>
    <div class="scroll-arrow"></div>
  </div>
</header>

<section id="ultimo-km" class="reveal" style="background:#0f172a;color:#fff;padding:96px 0;">
  <div class="wrap" style="max-width:820px">
    <span style="display:inline-block;border:1px solid var(--naranja);color:var(--naranja);font-size:12px;font-weight:600;letter-spacing:.5px;padding:6px 14px;margin-bottom:28px;border-radius:2px">El último kilómetro</span>
    <h2 style="font-size:clamp(28px,4.2vw,42px);font-weight:700;letter-spacing:-.02em;line-height:1.25;color:#fff;margin-bottom:28px">Los sistemas grandes manejan bien la oficina.<br><span style="color:var(--naranja)">Nosotros nos ocupamos del campo.</span></h2>
    <p style="font-size:18px;color:#cbd5e1;line-height:1.75;margin-bottom:22px">Si tu empresa o tu cliente ya usan SAP, Maximo u otro ERP, ActivaQR no compite con eso: cubre el tramo que ellos no cubren. El que va desde el equipo físico hasta la planilla. Hoy ese tramo lo hace el papel.</p>
    <p style="font-size:18px;color:#cbd5e1;line-height:1.75;margin-bottom:0"><strong style="color:#fff;font-weight:700">El técnico escanea el QR, carga la medición y la foto desde el celular,</strong> incluso sin señal. Cuando vuelve la conexión, los datos suben solos. Después lo exportás en el formato que pida tu cliente: PDF, CSV, lo que sea.</p>
  </div>
</section>


<section class="dif reveal">
  <div class="wrap">
    <h2 class="titulo">Tres cosas que resolvemos donde otros no llegan</h2>
    <p class="bajada">Hay muchas apps de mantenimiento que muestran datos. Estas tres cosas son las que nos diferencian: están pensadas para el día a día del que trabaja afuera de la oficina.</p>
    <div class="grid g3">
      <div class="card">
        <h3>Funciona sin señal</h3>
        <p>El técnico carga la medición en el pad, en el socavón o en la cámara. Queda en el celular y sube sola cuando vuelve la conexión. Con la hora y la ubicación del momento que se midió.</p>
      </div>
      <div class="card">
        <h3>Una mano experta en el QR</h3>
        <p>Escaneás el equipo y no ves solo su ficha: ves los síntomas típicos, las causas más probables y cómo resolverlo. Cada rubro con su propio catálogo. El operario nuevo deja de quedar solo frente al equipo.</p>
      </div>
      <div class="card">
        <h3>Cadena de custodia en la foto</h3>
        <p>Cada foto trae GPS, hora real y modelo del celular. Sirve para auditorías, reclamos a seguros y para resolver disputas por traslados o extravíos. Exportable como reporte PDF.</p>
      </div>
    </div>
  </div>
</section>

<section class="reveal" style="border-top:3px solid var(--negro);background:#fff">
  <div class="wrap">
    <h2 class="titulo">Cómo funciona</h2>
    <div class="pasos">
      <div class="paso"><div class="n">1</div><div><h3>Cargás tus activos</h3><p>Equipos, sectores y responsables. Elegís el rubro de cada uno para que sepa qué medir.</p></div></div>
      <div class="paso"><div class="n">2</div><div><h3>Pegás el QR</h3><p>Imprimís el código de cada máquina y lo pegás. Listo para escanear desde cualquier celular.</p></div></div>
      <div class="paso"><div class="n">3</div><div><h3>Tu equipo mide</h3><p>El operario escanea, carga la medición y el sistema evalúa el estado contra los umbrales al instante.</p></div></div>
      <div class="paso"><div class="n">4</div><div><h3>Resolvés antes de la falla</h3><p>Las alertas te avisan. Vos intervenís, o pedís soporte remoto. Todo queda registrado y auditable.</p></div></div>
    </div>
  </div>
</section>

<section id="casos" class="reveal" style="background:#f8fafc">
  <div class="wrap">
    <h2 class="titulo">Pensado para el que está cerca del equipo</h2>
    <p class="bajada">Empresas de mantenimiento, contratistas y servicios que necesitan que el trabajo del campo llegue ordenado al cliente. Tres mercados donde ya estamos enfocados:</p>
    <div class="grid g3" style="margin-top:40px">

      <div class="card" style="border-left:4px solid var(--naranja)">
        <p style="font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--naranja);margin-bottom:10px;text-transform:uppercase">Vaca Muerta</p>
        <h3 style="margin-bottom:12px">Servicios y mantenimiento en el yacimiento</h3>
        <p style="color:var(--gris);font-size:15px;line-height:1.65">Si trabajás para una operadora, sabés que el reporte mensual auditable es el que define si seguís en el contrato. Acá cada medición se carga en el pad desde el celular, con foto y ubicación. El reporte se arma solo a fin de mes.</p>
        <p style="margin-top:16px;font-size:13px;color:var(--negro);font-weight:600">Activos típicos: compresores, generadores, plantas de bombeo, equipos de alta presión</p>
      </div>

      <div class="card" style="border-left:4px solid var(--naranja)">
        <p style="font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--naranja);margin-bottom:10px;text-transform:uppercase">Minería</p>
        <h3 style="margin-bottom:12px">Contratistas que dan servicio a las grandes mineras</h3>
        <p style="color:var(--gris);font-size:15px;line-height:1.65">La mina ya tiene su sistema. Lo que necesita son las planillas tuyas en tiempo y forma, con la trazabilidad que pide auditoría. Acá el técnico carga la medición en el yacimiento y la planilla queda lista, sin reescribirla en Excel después.</p>
        <p style="margin-top:16px;font-size:13px;color:var(--negro);font-weight:600">Activos típicos: cintas transportadoras, generadores, compresores, equipos de izaje</p>
      </div>

      <div class="card" style="border-left:4px solid var(--naranja)">
        <p style="font-size:11px;font-weight:600;letter-spacing:.5px;color:var(--naranja);margin-bottom:10px;text-transform:uppercase">Eólico Patagonia</p>
        <h3 style="margin-bottom:12px">O&amp;M de parques en Chubut y Santa Cruz</h3>
        <p style="color:var(--gris);font-size:15px;line-height:1.65">Cada aerogenerador con su QR en la entrada de torre. El técnico sube, escanea y ve estado, última intervención y las fallas típicas de la categoría (gearbox, pitch, yaw). En la góndola no hay señal, así que la medición queda guardada y sube cuando baja.</p>
        <p style="margin-top:16px;font-size:13px;color:var(--negro);font-weight:600">Activos típicos: aerogeneradores, transformadores de torre, subestaciones de parque</p>
      </div>

    </div>

    <p style="margin-top:32px;color:var(--gris);font-size:14px;text-align:center">También se usa en frigoríficos, talleres, hospitales, agro y obra. Si tu equipo se rompe y te frena la facturación, sirve.</p>
  </div>
</section>

<section id="demo" class="reveal" style="background:#fff7ed;border-top:3px solid #0f172a;border-bottom:3px solid #0f172a;padding:64px 0;">
  <div class="wrap" style="max-width:700px;margin:0 auto;text-align:center;">
    <p style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Acceso de prueba</p>
    <h2 style="font-size:32px;font-weight:900;color:#0f172a;margin:0 0 16px;">Probá la app sin registrarte</h2>
    <p style="font-size:15px;color:#475569;margin:0 0 32px;">Abrí una sesión de demostración con datos de ejemplo. El acceso se prepara automáticamente y no modifica la información de otras empresas.</p>
    <a href="${appUrl}#/login?demo=1" style="display:inline-block;background:#f97316;color:#fff;font-size:15px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;padding:16px 36px;border:3px solid #0f172a;box-shadow:6px 6px 0px #0f172a;">Probar la app ahora &rarr;</a>
  </div>
</section>

<section id="historia" class="reveal" style="background:#0f172a;border-top:3px solid #0f172a;border-bottom:3px solid #0f172a;padding:64px 0;">
  <div class="wrap" style="max-width:760px;margin:0 auto;">
    <p style="font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">Experiencia de campo convertida en producto</p>
    <h2 style="font-size:clamp(26px,4vw,36px);font-weight:900;color:#fff;margin:0 0 24px;line-height:1.15;">Naci&oacute; para resolver un problema operativo real.</h2>
    <div style="font-size:16px;color:#cbd5e1;line-height:1.7;">
      <p style="margin:0 0 18px;">ActivaQR fue creada por Jes&uacute;s Olgu&iacute;n a partir de su experiencia con equipos, electricidad industrial y mantenimiento. El punto de partida no fue una presentaci&oacute;n comercial: fue la necesidad de saber qu&eacute; activo estaba en riesgo, qu&eacute; se hab&iacute;a medido y cu&aacute;ndo correspond&iacute;a intervenir.</p>
      <p style="margin:0 0 18px;">La plataforma une el equipo f&iacute;sico con su historial digital mediante un QR. Cada medici&oacute;n, foto, alerta y mantenimiento queda asociado al activo y disponible para quien necesita decidir, incluso cuando el trabajo se realiza sin se&ntilde;al.</p>
      <p style="margin:0;">El producto sigue evolucionando con una prioridad concreta: que el registro de campo sea simple para el t&eacute;cnico y confiable para la empresa que recibe el informe.</p>
    </div>
  </div>
</section>

${renderBitacoraPreview()}

<section id="implementacion" class="reveal">
  <div class="wrap">
    <h2 class="titulo">Implementaci&oacute;n acompa&ntilde;ada, sin vender humo</h2>
    <p class="bajada">ActivaQR es un producto operativo con soporte directo. La puesta en marcha se adapta al inventario y al proceso de mantenimiento que ya usa cada empresa.</p>
    <div class="grid g3">
      <div class="card">
        <p class="num">01 &middot; Relevamiento</p>
        <h3>Partimos de tu operaci&oacute;n real</h3>
        <p>Definimos activos, responsables, par&aacute;metros y frecuencia de mantenimiento por horas, kil&oacute;metros o calendario.</p>
      </div>
      <div class="card">
        <p class="num">02 &middot; Puesta en marcha</p>
        <h3>Carga inicial y capacitaci&oacute;n</h3>
        <p>Pod&eacute;s importar el inventario por CSV, generar los QR y capacitar a administradores y t&eacute;cnicos antes de salir a campo.</p>
      </div>
      <div class="card">
        <p class="num">03 &middot; Continuidad</p>
        <h3>Soporte con permiso y trazabilidad</h3>
        <p>El cliente habilita el acceso remoto cuando lo necesita. Cada intervenci&oacute;n queda registrada y el permiso se puede revocar.</p>
      </div>
    </div>
    <p style="margin-top:24px;color:var(--gris);font-size:14px">Integraciones: exportaci&oacute;n PDF/CSV disponible. Las conexiones con ERP, SCADA u otros sistemas se eval&uacute;an seg&uacute;n la API o el formato de intercambio de cada empresa. Actualmente no se ofrece un SLA formal.</p>
  </div>
</section>

<section id="voces" class="reveal" style="background:#f8fafc;border-top:3px solid var(--negro)">
  <div class="wrap">
    <h2 class="titulo">Voces de la comunidad</h2>
    <p class="bajada">T&eacute;cnicos, due&ntilde;os de PYMES, mantenedores, contratistas. Si trabaj&aacute;s con activos, contanos tu experiencia: qu&eacute; te frustra, qu&eacute; te ayudar&iacute;a, c&oacute;mo lo resolv&eacute;s hoy.</p>
    <div id="muroTestimonios" class="grid g2" style="margin-bottom:36px">
      <div class="testi-empty" style="grid-column:1/-1">Cargando voces...</div>
    </div>
    <div id="testiCta" style="text-align:center">
      <button class="btn btn-negro" id="btnAbrirTesti" type="button">Dejar mi testimonio</button>
    </div>
    <div id="testiFormBox" class="form-box" style="display:none;max-width:600px;margin:0 auto">
      <form id="testiForm">
        <div class="testi-row">
          <div>
            <label for="tNombre">Nombre</label>
            <input id="tNombre" name="nombre" required maxlength="80" placeholder="Tu nombre" />
          </div>
          <div>
            <label for="tRol">Rol / empresa</label>
            <input id="tRol" name="rol" maxlength="80" placeholder="Ej: T&eacute;cnico, Due&ntilde;a de gimnasio" />
          </div>
        </div>
        <label for="tEmail">Email (opcional, no se publica)</label>
        <input id="tEmail" name="email" type="email" maxlength="120" placeholder="vos@email.com" />
        <label for="tMensaje">Tu mensaje</label>
        <textarea id="tMensaje" name="mensaje" rows="4" required maxlength="1500" placeholder="Cont&aacute; tu experiencia con el mantenimiento..."></textarea>
        <button type="submit" class="btn btn-naranja" id="testiBtn">Enviar testimonio</button>
        <div class="form-msg" id="testiMsg"></div>
        <p style="font-size:12px;color:var(--gris-c);margin-top:12px">Tu mensaje ser&aacute; revisado antes de aparecer p&uacute;blico. Al enviar aceptás nuestras pol&iacute;ticas.</p>
      </form>
    </div>
  </div>
</section>

<section id="planes" class="reveal">
  <div class="wrap">
    <h2 class="titulo">Planes</h2>
    <p class="bajada">Empezá chico y crecé cuando lo necesites. <strong>30 días gratis, sin tarjeta.</strong></p>
    <div class="planes">
      ${planes}
    </div>
    <p style="text-align:center;margin-top:22px;font-size:13px;color:var(--gris)">Los planes se expresan en USD. Mercado Pago cobra en ARS al dólar MEP vendedor vigente y el equivalente se actualiza automáticamente. Sin costo de instalación ni permanencia mínima.</p>
  </div>
</section>

<section id="servicio" class="reveal" style="background:#0f172a;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)">
  <div class="wrap">
    <h2 class="titulo" style="color:#fff">¿Querés que tomemos las mediciones por vos?</h2>
    <p class="bajada" style="color:#94a3b8">Sumá el Plan Gestionado a tu suscripción. Nosotros relevamos; vos recibís la información.</p>
    <div style="background:#fff;border:3px solid var(--naranja);box-shadow:6px 6px 0 var(--naranja);padding:32px;max-width:760px;margin:0 auto">
      <p style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:14px">Plan Gestionado · Cotización personalizada</p>
      <p style="font-size:17px;color:var(--negro);line-height:1.6;margin-bottom:20px">
        Es un servicio adicional a la suscripción de software. Acordamos la frecuencia, relevamos los
        equipos en planta, cargamos las mediciones en ActivaQR y entregamos un
        <strong>informe profesional en PDF</strong> listo para auditorías o tus propios clientes.
      </p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:8px" class="servicio-grid">
        <div style="border:2px solid #e2e8f0;padding:16px">
          <p style="font-weight:900;font-size:15px;margin-bottom:4px">Frecuencia a medida</p>
          <p style="font-size:13px;color:var(--gris)">Definimos visitas según cantidad de equipos, criticidad y ubicación.</p>
        </div>
        <div style="border:2px solid #e2e8f0;padding:16px">
          <p style="font-weight:900;font-size:15px;margin-bottom:4px">Informe automático</p>
          <p style="font-size:13px;color:var(--gris)">Resumen del período, alertas detectadas y recomendaciones, en PDF.</p>
        </div>
        <div style="border:2px solid #e2e8f0;padding:16px">
          <p style="font-weight:900;font-size:15px;margin-bottom:4px">Aviso ante alertas críticas</p>
          <p style="font-size:13px;color:var(--gris)">Si algo se sale de rango antes de la visita, te avisamos por WhatsApp.</p>
        </div>
      </div>
      <p style="font-size:13px;color:var(--gris-c);margin-top:18px">El abono se cotiza aparte según equipos, horas de campo, frecuencia, distancia y viáticos. La suscripción de ActivaQR se factura por separado.</p>
      <a class="btn btn-naranja" href="#contacto" data-plan-contacto="gestionado" style="margin-top:20px">Solicitar cotización</a>
    </div>
  </div>
</section>

<section id="contacto" class="contacto">
  <div class="wrap">
    <h2 class="titulo">Sumate a ActivaQR</h2>
    <p class="bajada">Dejanos tus datos y te contactamos para activar tu cuenta y elegir el plan que mejor te queda.</p>
    <div class="form-box">
      <form id="leadForm">
        <input id="leadPlan" name="plan" type="hidden" />
        <label for="nombre">Nombre y apellido</label>
        <input id="nombre" name="nombre" required placeholder="Tu nombre" />
        <label for="empresa">Empresa</label>
        <input id="empresa" name="empresa" placeholder="Nombre de tu empresa o taller" />
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="vos@empresa.com" />
        <label for="telefono">Teléfono / WhatsApp</label>
        <input id="telefono" name="telefono" placeholder="Con código de área" />
        <label for="mensaje">Contanos qué necesitás</label>
        <textarea id="mensaje" name="mensaje" rows="3" placeholder="Cuántos equipos, de qué rubro, etc."></textarea>
        <button type="submit" class="btn btn-naranja" id="leadBtn">Solicitar acceso</button>
        <div class="form-msg" id="leadMsg"></div>
      </form>
      ${botonWhatsapp ? `<div style="margin-top:16px;text-align:center;">${botonWhatsapp}</div>` : ''}
    </div>
  </div>
</section>

${seccionApoyo}

<footer class="site-footer">
  <div class="wrap footer-contenido">
    <div class="footer-superior">
      <div>
        <p class="footer-kicker">Gesti&oacute;n de activos industriales con QR</p>
        <p class="footer-frase">De la medici&oacute;n en campo a una decisi&oacute;n clara.</p>
      </div>
      <div class="footer-acciones">
        <a class="footer-enlace" href="/bitacora/">Bit&aacute;cora</a>
        <a class="footer-enlace" href="#planes">Ver planes</a>
        <a class="footer-app" href="${appUrl}" target="_blank" rel="noopener">Ingresar a la app</a>
      </div>
    </div>
    <div class="marca-gigante" aria-label="Activa QR">
      <span class="marca-activa">Activa</span>
      <span class="marca-qr">QR</span>
    </div>
    <div class="footer-inferior">
      <span>Hecho en Argentina &middot; &copy; 2026 ActivaQR</span>
      <div class="footer-legales" aria-label="Informaci&oacute;n legal">
        <a href="https://api.activaqr.net/politica-uso">Pol&iacute;tica de Uso</a>
        <a href="https://api.activaqr.net/politica-privacidad">Pol&iacute;tica de Privacidad</a>
      </div>
    </div>
  </div>
</footer>

<script>
  document.getElementById('leadForm').addEventListener('submit', async function(e){
    e.preventDefault();
    var btn = document.getElementById('leadBtn');
    var msg = document.getElementById('leadMsg');
    var datos = {
      nombre: this.nombre.value.trim(),
      empresa: this.empresa.value.trim(),
      email: this.email.value.trim(),
      telefono: this.telefono.value.trim(),
      mensaje: this.mensaje.value.trim(),
      plan: this.plan.value || new URLSearchParams(window.location.search).get('plan'),
      atribucion: {
        source: new URLSearchParams(window.location.search).get('utm_source'),
        medium: new URLSearchParams(window.location.search).get('utm_medium'),
        campaign: new URLSearchParams(window.location.search).get('utm_campaign'),
        content: new URLSearchParams(window.location.search).get('utm_content'),
        term: new URLSearchParams(window.location.search).get('utm_term')
      }
    };
    btn.disabled = true; btn.textContent = 'Enviando...';
    msg.className = 'form-msg';
    try {
      var r = await fetch('https://api.activaqr.net/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (!r.ok) {
        // Mostrar el motivo real del servidor (limite alcanzado, falta un dato)
        // en vez de un error generico que parece la app rota.
        var detalle = await r.json().catch(function () { return null; });
        throw new Error((detalle && detalle.error) || '');
      }
      msg.className = 'form-msg ok';
      msg.textContent = 'Listo! Recibimos tu solicitud. Te contactamos a la brevedad.';
      this.reset();
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = (err && err.message)
        ? err.message
        : 'No pudimos enviar el formulario. Escribinos por WhatsApp y te respondemos al toque.';
    } finally {
      btn.disabled = false; btn.textContent = 'Solicitar acceso';
    }
  });

  document.querySelectorAll('[data-plan-contacto]').forEach(function(enlace){
    enlace.addEventListener('click', function(){
      var plan = enlace.getAttribute('data-plan-contacto') || '';
      document.getElementById('leadPlan').value = plan;
      if(plan === 'gestionado'){
        document.getElementById('mensaje').value = 'Quiero cotizar la toma y carga de mediciones. Cantidad aproximada de equipos: ';
      }
    });
  });
</script>

<script>
// Scroll hint: desaparece al bajar
const hint = document.getElementById('scrollHint');
if(hint){
  window.addEventListener('scroll', function(){
    hint.style.opacity = window.scrollY > 60 ? '0' : '1';
  }, {passive:true});
}

// Fade-in reveal al scrollear
const observer = new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){ e.target.classList.add('visible'); }
    else { e.target.classList.remove('visible'); }
  });
}, {threshold:0.12});
document.querySelectorAll('.reveal').forEach(function(el){ observer.observe(el); });

// Parallax suave del fondo aurora
var auroraInner = document.getElementById('auroraInner');
if(auroraInner){
  var ticking = false;
  window.addEventListener('scroll', function(){
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(function(){
      ticking = false;
      auroraInner.style.transform = 'translate3d(0,' + (window.scrollY * 0.18) + 'px,0)';
    });
  }, {passive:true});
}

</script>

<script>
// Muro de testimonios: carga los aprobados desde la API.
function escTesti(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}
(function cargarMuro(){
  var cont = document.getElementById('muroTestimonios');
  if(!cont) return;
  fetch('https://api.activaqr.net/api/testimonios').then(function(r){ return r.ok ? r.json() : []; }).then(function(lista){
    if(!Array.isArray(lista) || lista.length === 0){
      cont.innerHTML = '<div class="testi-empty" style="grid-column:1/-1">A&uacute;n no hay testimonios publicados. S&eacute; el primero en dejar el tuyo.</div>';
      return;
    }
    cont.innerHTML = lista.map(function(t){
      var badge = t.destacado ? '<span class="testi-badge">&#9733; Destacado</span>' : '';
      var rol = t.rol ? '<div class="r">' + escTesti(t.rol) + '</div>' : '';
      return '<article class="testi-card' + (t.destacado ? ' destacado' : '') + '">' +
        badge +
        '<p class="testi-msg">' + escTesti(t.mensaje) + '</p>' +
        '<div class="testi-autor"><div class="n">' + escTesti(t.nombre) + '</div>' + rol + '</div>' +
      '</article>';
    }).join('');
  }).catch(function(){
    cont.innerHTML = '<div class="testi-empty" style="grid-column:1/-1">No se pudieron cargar los testimonios.</div>';
  });
})();

// Toggle del formulario de testimonio.
var btnAbrirTesti = document.getElementById('btnAbrirTesti');
if(btnAbrirTesti){
  btnAbrirTesti.addEventListener('click', function(){
    var box = document.getElementById('testiFormBox');
    document.getElementById('testiCta').style.display = 'none';
    box.style.display = 'block';
    box.scrollIntoView({behavior:'smooth', block:'center'});
  });
}

// Envio del testimonio (queda pendiente de moderacion).
var testiForm = document.getElementById('testiForm');
if(testiForm){
  testiForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var btn = document.getElementById('testiBtn');
    var msg = document.getElementById('testiMsg');
    var datos = {
      nombre: this.nombre.value.trim(),
      rol: this.rol.value.trim(),
      email: this.email.value.trim(),
      mensaje: this.mensaje.value.trim()
    };
    btn.disabled = true; btn.textContent = 'Enviando...';
    msg.className = 'form-msg';
    try {
      var r = await fetch('https://api.activaqr.net/api/testimonios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (!r.ok) {
        var j = await r.json().catch(function(){ return {}; });
        throw new Error(j.error || 'fallo');
      }
      msg.className = 'form-msg ok';
      msg.textContent = 'Gracias! Tu testimonio quedo pendiente de revision y va a aparecer cuando lo aprobemos.';
      this.reset();
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = err && err.message && err.message !== 'fallo' ? err.message : 'No pudimos enviar tu testimonio. Proba de nuevo en un rato.';
    } finally {
      btn.disabled = false; btn.textContent = 'Enviar testimonio';
    }
  });
}
</script>

</body>
</html>`;
}
