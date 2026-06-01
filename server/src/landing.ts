/**
 * Landing page pública de ActivaQR, servida por el backend en la raíz "/".
 * Estilo neo-brutalista: bordes gruesos, sombras duras, naranja/negro/blanco.
 * Sin emojis. El formulario de contacto postea a /api/leads.
 */

export function renderLanding(appUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ActivaQR — Gestión de activos industriales con QR</title>
<meta name="description" content="Convertí cada máquina de tu planta en un nodo inteligente. Ficha pública por QR, alertas automáticas, soporte remoto. Sin papel, sin excusas." />
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

  /* HERO */
  .hero{padding:72px 0 56px;border-bottom:3px solid var(--negro)}
  .hero .tag{display:inline-block;background:#fff7ed;border:2px solid var(--naranja);color:#ea580c;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:6px 12px;margin-bottom:20px}
  .hero h1{font-size:clamp(34px,6vw,60px);margin-bottom:20px}
  .hero h1 .o{color:var(--naranja)}
  .hero p.sub{font-size:clamp(16px,2.4vw,21px);color:var(--gris);max-width:620px;margin-bottom:30px}
  .hero .acciones{display:flex;gap:14px;flex-wrap:wrap}

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
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <span class="brand">ActivaQR</span>
    <div class="links">
      <a class="nav-link" href="#features">Funciones</a>
      <a class="nav-link" href="#categorias">Rubros</a>
      <a class="nav-link" href="#planes">Planes</a>
      <a class="btn btn-naranja" href="${appUrl}" target="_blank" rel="noopener">Ingresar</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <span class="tag">Sin papel. Sin excusas.</span>
    <h1>Cada máquina de tu planta, un <span class="o">nodo inteligente</span>.</h1>
    <p class="sub">Pegás un QR en el equipo y cualquier persona con un celular ve su ficha técnica al instante. Tu equipo carga mediciones, recibe alertas automáticas cuando algo se sale de rango y resuelve antes de que se rompa.</p>
    <div class="acciones">
      <a class="btn btn-naranja" href="#contacto">Quiero suscribirme</a>
      <a class="btn btn-blanco" href="${appUrl}" target="_blank" rel="noopener">Ver la app</a>
    </div>
  </div>
</header>

<section id="features">
  <div class="wrap">
    <h2 class="titulo">Todo lo que necesita el mantenimiento moderno</h2>
    <p class="bajada">Desde el operario en el piso de planta hasta el gerente que mira el tablero. Una sola herramienta, en el celular.</p>
    <div class="grid g3">
      <div class="card"><p class="num">01</p><h3>Ficha pública por QR</h3><p>Escaneás el QR de la máquina y ves estado, última medición, valores de referencia y responsable. Sin app, sin login.</p></div>
      <div class="card"><p class="num">02</p><h3>Alertas automáticas</h3><p>Definís umbrales por equipo. Cuando una medición los supera, el activo cambia de estado solo: normal, alerta, crítico o urgente.</p></div>
      <div class="card"><p class="num">03</p><h3>Parámetros por rubro</h3><p>Un motor diesel no se mide igual que un equipo de estética. Cada categoría trae sus propios parámetros y umbrales listos.</p></div>
      <div class="card"><p class="num">04</p><h3>Mantenimientos</h3><p>Preventivos y correctivos por activo, con técnicos asignados, fechas y tareas vencidas marcadas automáticamente.</p></div>
      <div class="card"><p class="num">05</p><h3>Soporte remoto real</h3><p>Nuestro equipo puede entrar, ver tus activos y registrar mediciones por vos. Con chat de fotos y audio. Siempre con tu permiso.</p></div>
      <div class="card"><p class="num">06</p><h3>Reportes y QR</h3><p>Generá reportes en PDF por activo, sector o planta completa. Imprimí los códigos QR de cada equipo.</p></div>
    </div>
  </div>
</section>

<section class="dif">
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

<section id="categorias">
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

<section style="border-top:3px solid var(--negro);background:#fff">
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

<section id="planes">
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
          <li>Hasta 50 activos</li>
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

</body>
</html>`;
}
