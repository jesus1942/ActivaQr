/**
 * Landing page pública de ActivaQR, servida por el backend en la raíz "/".
 * Estilo neo-brutalista: bordes gruesos, sombras duras, naranja/negro/blanco.
 * Sin emojis. El formulario de contacto postea a /api/leads.
 */

export function renderLanding(appUrl: string, whatsapp?: string): string {
  // whatsapp: numero en formato internacional sin signos (ej: 5491112345678)
  const wa = (whatsapp || '').replace(/\D/g, '');
  const waMsg = encodeURIComponent('Hola! Vi ActivaQR y quiero conocer mas sobre la app.');
  const botonWhatsapp = wa
    ? `<a class="btn btn-negro" href="https://wa.me/${wa}?text=${waMsg}" target="_blank" rel="noopener">Escribinos por WhatsApp</a>`
    : '';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- SEO primario -->
<title>ActivaQR — Gestión de activos industriales con QR | Patagonia Argentina</title>
<meta name="description" content="Sistema de gestión de activos industriales con QR para empresas de Patagonia. Mantenimiento predictivo, alertas automáticas, historial digitalizado. Probá gratis 14 días." />
<meta name="keywords" content="gestión de activos industriales, mantenimiento preventivo, CMMS, QR equipos, Patagonia, Neuquén, Puerto Madryn, Vaca Muerta, software mantenimiento Argentina" />
<meta name="author" content="ActivaQR" />
<link rel="canonical" href="https://activaqr-production.up.railway.app/" />

<!-- Open Graph (WhatsApp, LinkedIn, Facebook) -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://activaqr-production.up.railway.app/" />
<meta property="og:title" content="ActivaQR — Gestión de activos industriales con QR" />
<meta property="og:description" content="Pegás un QR en cada equipo y convertís el mantenimiento en datos. Anticipás roturas, reducís costos y aumentás la disponibilidad de tu planta." />
<meta property="og:image" content="https://jesus1942.github.io/ActivaQr/company-logo-hd.png" />
<meta property="og:locale" content="es_AR" />
<meta property="og:site_name" content="ActivaQR" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="ActivaQR — Gestión de activos industriales con QR" />
<meta name="twitter:description" content="Pegás un QR en cada equipo y convertís el mantenimiento en datos. Probá gratis 14 días." />
<meta name="twitter:image" content="https://jesus1942.github.io/ActivaQr/company-logo-hd.png" />

<!-- Schema.org: SoftwareApplication -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ActivaQR",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "description": "Sistema SaaS de gestión de activos industriales con códigos QR. Mantenimiento preventivo y predictivo, alertas automáticas, historial digitalizado y soporte remoto.",
  "url": "https://activaqr-production.up.railway.app/",
  "offers": {
    "@type": "Offer",
    "price": "150",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "150",
      "priceCurrency": "USD",
      "unitText": "mes"
    }
  },
  "provider": {
    "@type": "Person",
    "name": "Jesús Narciso Olguín",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Neuquén",
      "addressRegion": "Neuquén",
      "addressCountry": "AR"
    }
  },
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": -38.9516,
      "longitude": -68.0591
    },
    "geoRadius": "1000000"
  }
}
</script>

<link rel="icon" type="image/png" href="https://jesus1942.github.io/ActivaQr/favicon.png" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--naranja:#f97316;--negro:#0f172a;--gris:#475569;--gris-c:#94a3b8;--fondo:#f1f5f9}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--negro);background:var(--fondo);line-height:1.5}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}
  h1,h2,h3{font-weight:900;text-transform:uppercase;letter-spacing:-.5px;line-height:1.05}
  .brand{font-weight:900;color:var(--naranja);text-transform:uppercase;letter-spacing:2px}
  a{color:inherit}
  .btn{display:inline-block;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:14px 26px;border:3px solid var(--negro);box-shadow:5px 5px 0 var(--negro);transition:transform .1s}
  .btn:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--negro)}
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
  .hero{min-height:100svh;display:flex;flex-direction:column;justify-content:center;border-bottom:3px solid var(--negro);padding:80px 0 100px;position:relative}
  .hero .tag{display:inline-block;background:#fff7ed;border:2px solid var(--naranja);color:#ea580c;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;margin-bottom:24px}
  .hero h1{font-size:clamp(40px,7vw,76px);margin-bottom:24px;line-height:1.0}
  .hero h1 .o{color:var(--naranja)}
  .hero p.sub{font-size:clamp(16px,2.2vw,20px);color:var(--gris);max-width:580px;margin-bottom:36px}
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
  section{padding:60px 0}
  .titulo{font-size:clamp(26px,4vw,38px);margin-bottom:12px}
  .bajada{color:var(--gris);max-width:640px;margin-bottom:36px;font-size:16px}

  .grid{display:grid;gap:18px}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g2{grid-template-columns:repeat(2,1fr)}
  @media(max-width:820px){.g3,.g2{grid-template-columns:1fr}}

  .card{background:#fff;border:3px solid var(--negro);box-shadow:5px 5px 0 var(--negro);padding:24px}
  .card h3{font-size:18px;margin-bottom:8px}
  .card p{color:var(--gris);font-size:15px}
  .card .num{font-size:12px;font-weight:900;color:var(--naranja);letter-spacing:1px}

  /* DIFERENCIAL */
  .dif{background:var(--negro);color:#fff;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)}
  .dif .titulo{color:#fff}
  .dif .bajada{color:var(--gris-c)}
  .dif .card{background:#1e293b;border-color:#334155;box-shadow:5px 5px 0 #000}
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
  .contacto{background:var(--naranja);border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)}
  .contacto .titulo{color:#fff}
  .contacto .bajada{color:#fff;opacity:.95}
  .form-box{background:#fff;border:3px solid var(--negro);box-shadow:6px 6px 0 var(--negro);padding:28px;max-width:540px}
  .form-box label{display:block;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--gris);margin-bottom:5px;margin-top:14px}
  .form-box label:first-child{margin-top:0}
  .form-box input,.form-box textarea{width:100%;border:2px solid #cbd5e1;padding:11px 13px;font-size:15px;font-family:inherit;outline:none}
  .form-box input:focus,.form-box textarea:focus{border-color:var(--naranja)}
  .form-box .btn{width:100%;margin-top:20px;border:none;cursor:pointer;font-family:inherit;font-size:15px}
  .form-msg{margin-top:14px;padding:12px;font-weight:700;font-size:14px;display:none}
  .form-msg.ok{display:block;background:#ecfdf5;border:2px solid #34d399;color:#047857}
  .form-msg.err{display:block;background:#fef2f2;border:2px solid #f87171;color:#b91c1c}

  /* FOOTER */
  footer{background:var(--negro);color:var(--gris-c);padding:32px 0;text-align:center;font-size:13px}
  footer .brand{font-size:18px;display:block;margin-bottom:8px}

  /* FADE-IN SCROLL */
  .reveal{opacity:0;transform:translateY(32px);transition:opacity .6s ease,transform .6s ease}
  .reveal.visible{opacity:1;transform:translateY(0)}
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <a class="brand" href="#" style="text-decoration:none">ActivaQR</a>
    <div class="links">
      <a class="nav-link" href="#features">Funciones</a>
      <a class="nav-link" href="#casos">Casos de uso</a>
      <a class="nav-link" href="#categorias">Rubros</a>
      <a class="nav-link" href="#vision">Vision</a>
      <a class="nav-link" href="#planes">Planes</a>
      <a class="nav-link" href="#servicio">Servicio</a>
      <a class="btn btn-naranja" href="${appUrl}" target="_blank" rel="noopener">Ingresar</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <span class="tag">Sin papel. Sin excusas.</span>
    <h1>Detectá las fallas<br>antes de que <span class="o">paren tu producción</span>.</h1>
    <p class="sub">Pegás un QR en cada equipo y convertís el mantenimiento en datos. Anticipás roturas, reducís costos de reparación y aumentás la disponibilidad de tu planta. Todo desde el celular, sin instalar nada.</p>
    <div class="acciones">
      <a class="btn btn-naranja" href="${appUrl}#/login?registro=1" target="_blank" rel="noopener">Probar gratis 14 días</a>
      <a class="btn btn-blanco" href="#contacto">Quiero suscribirme</a>
    </div>
  </div>
  <div class="scroll-hint" id="scrollHint">
    <span>Conocer más</span>
    <div class="scroll-arrow"></div>
  </div>
</header>

<section id="features" class="reveal">
  <div class="wrap">
    <h2 class="titulo">Menos paradas. Menos costos. Más control.</h2>
    <p class="bajada">Desde el operario en el piso de planta hasta el gerente que mira el tablero. Una sola herramienta, en el celular.</p>
    <div class="grid g3">
      <div class="card"><p class="num">01</p><h3>Toda la ficha en un escaneo</h3><p>Escaneás el QR de la máquina y ves estado, última medición, valores de referencia y responsable. Sin app, sin login.</p></div>
      <div class="card"><p class="num">02</p><h3>Avisos antes de la falla costosa</h3><p>Definís umbrales por equipo. Cuando una medición los supera, el activo cambia de estado solo: normal, alerta, crítico o urgente.</p></div>
      <div class="card"><p class="num">03</p><h3>Listo para tu rubro</h3><p>Un motor diesel no se mide igual que un equipo de estética. Cada categoría trae sus propios parámetros y umbrales listos.</p></div>
      <div class="card"><p class="num">04</p><h3>Órdenes de trabajo y cumplimiento</h3><p>Preventivos y correctivos por activo, con técnicos asignados, materiales, horas y tareas vencidas marcadas automáticamente.</p></div>
      <div class="card"><p class="num">05</p><h3>Soporte que entra por vos</h3><p>Nuestro equipo puede entrar, ver tus activos y registrar mediciones por vos. Con chat de fotos y audio. Siempre con tu permiso.</p></div>
      <div class="card"><p class="num">06</p><h3>Indicadores para decidir</h3><p>Tablero ejecutivo con disponibilidad, equipos más críticos, tendencia de fallas y mantenimiento predictivo. Reportes y QR en PDF.</p></div>
    </div>
  </div>
</section>

<section class="dif reveal">
  <div class="wrap">
    <h2 class="titulo">Lo que ningún otro hace</h2>
    <p class="bajada">Comparamos contra las soluciones de mantenimiento del mercado local y regional. Estas tres cosas no las tiene nadie más.</p>
    <div class="grid g3">
      <div class="card"><h3>QR sin login</h3><p>Todos los competidores exigen cuenta y sesión para ver un activo. ActivaQR muestra la ficha al instante a cualquiera con el celular.</p></div>
      <div class="card"><h3>Intervención remota</h3><p>Otros te dejan mirar datos. Nosotros entramos, registramos la medición y disparamos el recálculo de alertas. Tele-mantenimiento de verdad.</p></div>
      <div class="card"><h3>Precio local</h3><p>Pagás en pesos con Mercado Pago. Las alternativas internacionales arrancan en cientos de dólares por mes.</p></div>
    </div>
  </div>
</section>

<section id="categorias" class="reveal">
  <div class="wrap">
    <h2 class="titulo">Un rubro para cada equipo</h2>
    <p class="bajada">Plantillas de medición listas para usar, desde estética hasta ingeniería aeroespacial. Y podés crear las tuyas.</p>
    <div class="chips">
      <span class="chip">Motor Diesel / Generador</span>
      <span class="chip">Hidráulico</span>
      <span class="chip">Neumático / Compresor</span>
      <span class="chip">Eléctrico / Tablero</span>
      <span class="chip">Bomba Centrífuga</span>
      <span class="chip">HVAC / Climatización</span>
      <span class="chip">Estética / Belleza</span>
      <span class="chip">Equipo Médico</span>
      <span class="chip">Odontología</span>
      <span class="chip">Laboratorio</span>
      <span class="chip">Cadena de Frío</span>
      <span class="chip">Gastronomía</span>
      <span class="chip">Panadería</span>
      <span class="chip">Refrigeración Comercial</span>
      <span class="chip">Maquinaria Agrícola</span>
      <span class="chip">Flota de Vehículos</span>
      <span class="chip">Autoelevador</span>
      <span class="chip">Grúa / Izaje</span>
      <span class="chip">Naval</span>
      <span class="chip">Aviación General</span>
      <span class="chip">Aeroespacial / Propulsión</span>
      <span class="chip">IT / Informática</span>
      <span class="chip">Telecomunicaciones</span>
      <span class="chip">CCTV / Seguridad</span>
      <span class="chip">Minería</span>
      <span class="chip">Petróleo y Gas</span>
      <span class="chip">+ muchos más</span>
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

<section id="casos" class="reveal" style="background:#f8fafc;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)">
  <div class="wrap">
    <h2 class="titulo">Casos de uso reales</h2>
    <p class="bajada">Industrias que ya pueden usar ActivaQR hoy, sin adaptaciones.</p>
    <div class="grid g3" style="margin-top:40px">

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Petroleo y gas</p>
        <h3 style="margin-bottom:10px">Contratistas y empresas de servicios</h3>
        <p style="color:var(--gris);font-size:14px">Las operadoras exigen trazabilidad de mantenimiento. Con ActivaQR cada equipo tiene su historial auditable accesible desde el campo con el celular, sin papel ni planillas.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: compresores, generadores, autoelevadores, equipos de alta presion</p>
      </div>

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Salud y estetica</p>
        <h3 style="margin-bottom:10px">Clinicas, hospitales y centros esteticos</h3>
        <p style="color:var(--gris);font-size:14px">Los equipos medicos y esteticos requieren mantenimiento obligatorio con respaldo documental. El tecnico escanea el QR, carga la revision y queda todo registrado con fecha y firma digital.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: HIFU, laser, autoclave, ecografo, UPS, grupos electrogenos</p>
      </div>

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Construccion y obra civil</p>
        <h3 style="margin-bottom:10px">Empresas constructoras y vial</h3>
        <p style="color:var(--gris);font-size:14px">Maquinaria pesada moviendose entre obras. Con el modulo itinerante rastrean donde esta cada equipo, cuando salio, cuando vuelve y que mantenimiento le toca antes de la proxima jornada.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: retroexcavadoras, motoniveladoras, volquetes, hormigoneras</p>
      </div>

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Industria alimentaria y frigorifica</p>
        <h3 style="margin-bottom:10px">Plantas de procesamiento y camaras frigorificas</h3>
        <p style="color:var(--gris);font-size:14px">La cadena de frio exige control de temperatura constante. ActivaQR alerta automaticamente cuando un compresor o camara se sale del rango permitido, antes de comprometer el producto.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: compresores de frio, camaras, tuneles de congelado, lineas de proceso</p>
      </div>

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Talleres y metalurgia</p>
        <h3 style="margin-bottom:10px">Talleres mecanicos, torneria y metalmecanica</h3>
        <p style="color:var(--gris);font-size:14px">Maquinaria de alta precision que para la produccion si falla. Registro de horas de marcha, lubricaciones y revisiones periodicas. El tecnico sabe que le toca hacer antes de encender la maquina.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: tornos CNC, fresadoras, prensas, compresores de aire, soldadoras</p>
      </div>

      <div class="card" style="border-left:5px solid var(--naranja)">
        <p style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:8px">Energia y utilities</p>
        <h3 style="margin-bottom:10px">Plantas de generacion y distribucion electrica</h3>
        <p style="color:var(--gris);font-size:14px">Grupos electrogenos, tableros y UPS con control de voltaje, temperatura y horas de operacion. Las alertas criticas llegan al responsable antes de que se vaya la luz.</p>
        <p style="margin-top:14px;font-size:13px;font-weight:700;color:var(--negro)">Activos tipicos: generadores diesel, transformadores, tableros electricos, UPS industriales</p>
      </div>

    </div>
  </div>
</section>

<section id="demo" class="reveal" style="background:#fff7ed;border-top:3px solid #0f172a;border-bottom:3px solid #0f172a;padding:64px 0;">
  <div class="wrap" style="max-width:700px;margin:0 auto;text-align:center;">
    <p style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Acceso de prueba</p>
    <h2 style="font-size:32px;font-weight:900;color:#0f172a;margin:0 0 16px;">Probá la app sin registrarte</h2>
    <p style="font-size:15px;color:#475569;margin:0 0 32px;">Ingresá con las siguientes credenciales y explorá todas las funciones con datos de ejemplo reales.</p>
    <div style="display:inline-block;background:#0f172a;border:3px solid #0f172a;padding:24px 40px;text-align:left;margin-bottom:32px;">
      <div style="margin-bottom:12px;">
        <span style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Usuario</span><br/>
        <span style="font-size:18px;font-weight:900;color:#f97316;font-family:monospace;">demo@activaqr.com</span>
      </div>
      <div>
        <span style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Contraseña</span><br/>
        <span style="font-size:18px;font-weight:900;color:#f97316;font-family:monospace;">demo1234</span>
      </div>
    </div>
    <br/>
    <a href="${appUrl}#/login?demo=1" style="display:inline-block;background:#f97316;color:#fff;font-size:15px;font-weight:900;text-decoration:none;text-transform:uppercase;letter-spacing:1px;padding:16px 36px;border:3px solid #0f172a;box-shadow:6px 6px 0px #0f172a;">Probar la app ahora &rarr;</a>
  </div>
</section>

<section id="historia" class="reveal" style="background:#0f172a;border-top:3px solid #0f172a;border-bottom:3px solid #0f172a;padding:64px 0;">
  <div class="wrap" style="max-width:760px;margin:0 auto;">
    <p style="font-size:12px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">La historia detras de ActivaQR</p>
    <h2 style="font-size:clamp(26px,4vw,36px);font-weight:900;color:#fff;margin:0 0 24px;line-height:1.15;">Naci&oacute; en casa, resolviendo un problema real.</h2>
    <div style="font-size:16px;color:#cbd5e1;line-height:1.7;">
      <p style="margin:0 0 18px;">No vengo de una gran empresa de software. Soy autodidacta: aprend&iacute; a programar resolviendo problemas concretos de la vida cotidiana, esos que uno vive todos los d&iacute;as y que nadie termina de solucionar bien.</p>
      <p style="margin:0 0 18px;">ActivaQR empez&oacute; con una idea simple que surgi&oacute; en casa: proteger los equipos con los que trabajo a diario. Saber en qu&eacute; estado est&aacute;n, cu&aacute;ndo necesitan mantenimiento, y poder identificarlos al instante con solo escanear un c&oacute;digo. Que cualquiera que pase al lado de una m&aacute;quina sepa qu&eacute; es y c&oacute;mo est&aacute;, sin papeles ni planillas perdidas.</p>
      <p style="margin:0;">De esa necesidad real, entre el taller y el teclado, naci&oacute; esta plataforma. Hoy la comparto con vos porque creo que el mismo problema que ten&iacute;a yo, lo tienen muchos.</p>
    </div>
  </div>
</section>

<section class="capital-banner reveal">
  <div class="wrap">
    <h2>Los activos son capital. No solo equipos.</h2>
    <p>Cada máquina, vehículo o herramienta que usás en tu operación representa una inversión. Cuidarlos, medirlos y trazarlos no es un gasto: es proteger el capital de tu empresa y la continuidad del negocio. Lo mismo que hacés con tu equipo humano, tenés que hacerlo con tu capital físico.</p>
  </div>
</section>

<section id="vision" class="roadmap reveal">
  <div class="wrap">
    <h2 class="titulo">Hacia donde vamos</h2>
    <p class="bajada">Lo que ves hoy es la base. Esto es lo que se viene: más automatización, más alcance, menos intervención humana para lo rutinario.</p>
    <div class="fase">

      <div class="fase-item">
        <span class="fase-badge activo">Hoy disponible</span>
        <div class="fase-content">
          <h3>Gestion completa de activos con QR</h3>
          <p>Ficha pública por QR sin login, mediciones con alertas automáticas, mantenimientos preventivos, soporte remoto con chat de fotos y audio, reportes en PDF y exportación CSV. Multi-empresa, multi-sede, multi-técnico.</p>
        </div>
      </div>

      <div class="fase-item">
        <span class="fase-badge proximo">Proximo</span>
        <div class="fase-content">
          <h3>Seguimiento GPS para activos moviles</h3>
          <p>Flotas de vehículos, maquinaria vial, embarcaciones y equipos de campo. El técnico responsable queda inscripto en el activo antes de salir. Historial de recorrido, alertas por zona y velocidad. Conectividad celular en zonas urbanas e industriales.</p>
        </div>
      </div>

      <div class="fase-item">
        <span class="fase-badge proximo">Proximo</span>
        <div class="fase-content">
          <h3>Integracion con sensores IoT</h3>
          <p>Mediciones automáticas sin intervención humana. Dispositivos de bajo costo conectados al activo que mandan temperatura, vibración y amperaje al sistema cada pocos segundos. Sin depender de que alguien lo registre manualmente.</p>
        </div>
      </div>

      <div class="fase-item">
        <span class="fase-badge futuro">En el horizonte</span>
        <div class="fase-content">
          <h3>Cobertura en zonas sin señal — Starlink</h3>
          <p>Para operaciones en campo abierto, cuencas petroleras, obra vial en ruta y embarcaciones. Integración con antenas Starlink itinerantes para garantizar que ningún activo quede fuera de monitoreo, sin importar dónde esté.</p>
        </div>
      </div>

      <div class="fase-item">
        <span class="fase-badge futuro">En el horizonte</span>
        <div class="fase-content">
          <h3>Mantenimiento predictivo con analisis de tendencias</h3>
          <p>Cuando acumulás suficiente historia de mediciones, el sistema empieza a ver patrones. Una temperatura que sube 2 grados por semana durante un mes no es normal. La alerta llega antes de que falle, no después.</p>
        </div>
      </div>

    </div>
  </div>
</section>

<section id="planes" class="reveal">
  <div class="wrap">
    <h2 class="titulo">Planes</h2>
    <p class="bajada">Empezá chico y crecé cuando lo necesites. Todos con débito automático mensual por Mercado Pago.</p>
    <div class="planes">
      <div class="plan">
        <h3>Inicial</h3>
        <p class="precio">Para arrancar</p>
        <ul>
          <li>Hasta 10 activos</li>
          <li>2 técnicos</li>
          <li>Mediciones y mantenimientos</li>
          <li>Alertas automáticas</li>
          <li>Reportes en PDF</li>
        </ul>
        <a class="btn btn-negro" href="#contacto">Lo quiero</a>
      </div>
      <div class="plan destacado">
        <h3>Empresa</h3>
        <p class="precio">El más elegido</p>
        <ul>
          <li>Hasta 100 activos</li>
          <li>5 técnicos</li>
          <li>Ficha QR pública siempre activa</li>
          <li>Soporte remoto incluido</li>
          <li>Sectores e importación CSV</li>
        </ul>
        <a class="btn btn-naranja" href="#contacto">Lo quiero</a>
      </div>
      <div class="plan">
        <h3>Industrial</h3>
        <p class="precio">Sin límites</p>
        <ul>
          <li>Activos ilimitados</li>
          <li>Técnicos ilimitados</li>
          <li>Soporte prioritario</li>
          <li>Todo lo de Empresa</li>
          <li>Acompañamiento dedicado</li>
        </ul>
        <a class="btn btn-negro" href="#contacto">Lo quiero</a>
      </div>
    </div>
  </div>
</section>

<section id="servicio" class="reveal" style="background:#0f172a;border-top:3px solid var(--negro);border-bottom:3px solid var(--negro)">
  <div class="wrap">
    <h2 class="titulo" style="color:#fff">¿No tenés tiempo de cargar las mediciones?</h2>
    <p class="bajada" style="color:#94a3b8">Nosotros nos encargamos. Vos recibís el informe.</p>
    <div style="background:#fff;border:3px solid var(--naranja);box-shadow:6px 6px 0 var(--naranja);padding:32px;max-width:760px;margin:0 auto">
      <p style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:var(--naranja);margin-bottom:14px">Servicio gestionado de mantenimiento</p>
      <p style="font-size:17px;color:var(--negro);line-height:1.6;margin-bottom:20px">
        Combinás el software con nuestra visita técnica mensual. Un especialista va a tu planta,
        toma las mediciones de cada equipo, el sistema evalúa automáticamente las alertas, y al otro día
        recibís un <strong>informe profesional en PDF</strong> listo para auditorías o tus propios clientes.
      </p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:8px" class="servicio-grid">
        <div style="border:2px solid #e2e8f0;padding:16px">
          <p style="font-weight:900;font-size:15px;margin-bottom:4px">Visita mensual in situ</p>
          <p style="font-size:13px;color:var(--gris)">Mediciones tomadas por un técnico, sin que muevas a nadie de tu equipo.</p>
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
      <p style="font-size:13px;color:var(--gris-c);margin-top:18px">Ideal para talleres, contratistas y plantas que quieren trazabilidad sin sumar carga administrativa.</p>
      <a class="btn btn-naranja" href="#contacto" style="margin-top:20px">Quiero que se encarguen</a>
    </div>
  </div>
</section>

<section id="contacto" class="contacto">
  <div class="wrap">
    <h2 class="titulo">Sumate a ActivaQR</h2>
    <p class="bajada">Dejanos tus datos y te contactamos para activar tu cuenta y elegir el plan que mejor te queda.</p>
    <div class="form-box">
      <form id="leadForm">
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

<footer>
  <div class="wrap">
    <span class="brand">ActivaQR</span>
    Gestión de activos industriales con QR. Hecho en Argentina.
    <div style="margin-top:8px"><a href="${appUrl}" target="_blank" rel="noopener" style="color:var(--naranja);text-decoration:none;font-weight:700">Ingresar a la app</a></div>
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
      mensaje: this.mensaje.value.trim()
    };
    btn.disabled = true; btn.textContent = 'Enviando...';
    msg.className = 'form-msg';
    try {
      var r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      if (!r.ok) throw new Error('fallo');
      msg.className = 'form-msg ok';
      msg.textContent = 'Listo! Recibimos tu solicitud. Te contactamos a la brevedad.';
      this.reset();
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = 'No pudimos enviar el formulario. Escribinos directamente por email.';
    } finally {
      btn.disabled = false; btn.textContent = 'Solicitar acceso';
    }
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
</script>

</body>
</html>`;
}
