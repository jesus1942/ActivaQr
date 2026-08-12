export type EntradaBitacora = {
  version: string;
  fecha: string;
  fechaIso: string;
  titulo: string;
  resumen: string;
  impacto: string;
  capacidades: string[];
  destacada?: boolean;
};

export const ENTRADAS_BITACORA: EntradaBitacora[] = [
  {
    version: 'MULTIMARCA',
    fecha: '12 de agosto de 2026',
    fechaIso: '2026-08-12',
    titulo: 'Cada empresa puede conectar su propia nube Tuya o eWeLink',
    resumen: 'ActivaQR Control incorporó una arquitectura por capacidades y un adaptador Tuya / Smart Life Cloud para importar sensores, medidores e interruptores sin mezclar las cuentas de distintas empresas.',
    impacto: 'Una organización administra solamente sus conectores y dispositivos. La telemetría genérica sigue abierta a otras marcas, mientras el control remoto se habilita únicamente cuando existe un adaptador certificado.',
    capacidades: ['Tuya / Smart Life Cloud por tenant', 'Aislamiento de dispositivos, escenas y alarmas por empresa', 'Control limitado a adaptadores certificados'],
    destacada: true,
  },
  {
    version: 'NUEVO',
    fecha: '12 de agosto de 2026',
    fechaIso: '2026-08-12',
    titulo: 'El control se abre a sensores, energía, alarmas y escenas',
    resumen: 'ActivaQR Control amplió su tablero para interpretar sensores ambientales, magnéticos y de inundación, mostrar las mediciones eléctricas de equipos multicanal y reunir escenas seguras y avisos móviles en la misma operación.',
    impacto: 'El panel deja de mirar solamente si una salida está encendida: ahora puede explicar qué mide, qué condición exige atención y qué conjunto de maniobras confirmó una persona.',
    capacidades: ['Corriente, voltaje, potencia y consumo por canal', 'Reglas y push para sensores y desconexiones', 'Escenas multisalida confirmadas y auditadas'],
    destacada: true,
  },
  {
    version: 'BITÁCORA',
    fecha: '12 de agosto de 2026',
    fechaIso: '2026-08-12',
    titulo: 'La evolución de ActivaQR ahora es pública',
    resumen: 'Nace la Bitácora ActivaQR: un lugar abierto para mostrar qué se construyó, qué problema resuelve cada avance y hacia dónde sigue creciendo la plataforma.',
    impacto: 'Quien descubre la aplicación ya no ve solamente una promesa comercial: puede recorrer el producto real, sus pruebas y su evolución.',
    capacidades: ['Acceso visible desde la landing', 'Historial cronológico de versiones', 'Hitos explicados en lenguaje claro'],
    destacada: true,
  },
  {
    version: '1.5.1',
    fecha: '12 de agosto de 2026',
    fechaIso: '2026-08-12',
    titulo: 'Prueba real superada: ActivaQR ya conversa con eWeLink',
    resumen: 'El dashboard se comunicó con dispositivos reales vinculados a eWeLink. Desde ActivaQR se pueden consultar sus estados y operar las salidas habilitadas de equipos SONOFF multicanal.',
    impacto: 'El activo deja de ser solamente una ficha con historial: también puede mostrar su estado operativo y, con permisos y confirmación, responder a una maniobra real.',
    capacidades: ['Estados actualizados cada 5 segundos', 'Control confirmado de SONOFF Dual R3', 'Experiencia móvil completa en Control Industrial'],
    destacada: true,
  },
  {
    version: '1.5.0',
    fecha: '12 de agosto de 2026',
    fechaIso: '2026-08-12',
    titulo: 'Cada dispositivo y cada canal construyen su propia historia',
    resumen: 'Los equipos y sus canales ahora pueden tener nombres operativos. Cada cambio y maniobra queda asociado al origen correcto y el historial puede descargarse sin mezclar señales.',
    impacto: 'Un Dual R3 puede llamarse por su ubicación y cada salida por su función real. La trazabilidad se entiende sin traducir identificadores técnicos.',
    capacidades: ['Alias por equipo y por canal', 'Historial persistente sin duplicados innecesarios', 'Exportación CSV por dispositivo o canal'],
  },
  {
    version: '1.4.2',
    fecha: '11 de agosto de 2026',
    fechaIso: '2026-08-11',
    titulo: 'Conexión segura y renovable con eWeLink',
    resumen: 'ActivaQR incorporó autorización OAuth para vincular una cuenta eWeLink sin pedir que el usuario copie y mantenga tokens manualmente.',
    impacto: 'La integración puede renovar su acceso y sincronizar los dispositivos de la cuenta preservando el aislamiento de cada empresa.',
    capacidades: ['Autorización OAuth', 'Renovación automática del acceso', 'Sincronización de dispositivos y canales'],
  },
  {
    version: '1.4.0',
    fecha: '10 de agosto de 2026',
    fechaIso: '2026-08-10',
    titulo: 'Nace ActivaQR Control',
    resumen: 'Se abrió una nueva capa dentro de la plataforma para reunir conectores, dispositivos, variables, alarmas, comandos e historial industrial.',
    impacto: 'La información de campo, la identidad QR y las señales conectadas empiezan a vivir alrededor del mismo activo y bajo la misma trazabilidad.',
    capacidades: ['Conectores industriales por empresa', 'Telemetría, alarmas y comandos auditables', 'Contratos de monitoreo o control remoto'],
  },
  {
    version: '1.3.4',
    fecha: '4 de agosto de 2026',
    fechaIso: '2026-08-04',
    titulo: 'Una presentación que muestra el flujo funcionando',
    resumen: 'La presentación comercial pasó a recorrer pantallas y casos reales de la plataforma, con narración y un relato centrado en el trabajo de campo.',
    impacto: 'ActivaQR puede explicarse desde el problema hasta la evidencia de cierre sin depender de una lista abstracta de funciones.',
    capacidades: ['Recorrido comercial guiado', 'Narración automatizada', 'Casos de uso y métricas para pilotos'],
  },
];

function renderCapacidades(capacidades: string[]): string {
  return capacidades.map((capacidad) => `<li>${capacidad}</li>`).join('');
}

function versionVisible(version: string): string {
  return /^\d/.test(version) ? `v${version}` : version;
}

export function renderBitacoraPreview(): string {
  const novedades = ENTRADAS_BITACORA.slice(0, 3).map((entrada, index) => `
    <article class="bitacora-preview-card${index === 0 ? ' principal' : ''}">
      <div class="bitacora-meta"><span>${versionVisible(entrada.version)}</span><time datetime="${entrada.fechaIso}">${entrada.fecha}</time></div>
      <h3>${entrada.titulo}</h3>
      <p>${entrada.resumen}</p>
    </article>`).join('');

  return `<section id="evolucion" class="bitacora-preview reveal">
  <div class="wrap">
    <div class="bitacora-preview-cabecera">
      <div>
        <p class="bitacora-kicker">Producto vivo &middot; Progreso abierto</p>
        <h2 class="titulo">Estamos marcando una nueva frontera.</h2>
        <p class="bajada">No queremos medir ActivaQR por la cantidad de promesas. Mostramos lo que ya funciona, lo que aprendimos al probarlo y el poder que incorpora cada versión.</p>
      </div>
      <a class="btn btn-blanco" href="/bitacora/">Explorar la Bit&aacute;cora &rarr;</a>
    </div>
    <div class="bitacora-preview-grid">${novedades}</div>
  </div>
</section>`;
}

export function renderBitacora(appUrl: string): string {
  const entradas = ENTRADAS_BITACORA.map((entrada, index) => `
      <article class="entrada${entrada.destacada ? ' destacada' : ''}">
        <div class="rail" aria-hidden="true"><span>${String(index + 1).padStart(2, '0')}</span></div>
        <div class="entrada-cuerpo">
          <div class="meta"><span class="version">${versionVisible(entrada.version)}</span><time datetime="${entrada.fechaIso}">${entrada.fecha}</time>${entrada.destacada ? '<span class="estado">Disponible</span>' : ''}</div>
          <h2>${entrada.titulo}</h2>
          <p class="resumen">${entrada.resumen}</p>
          <div class="impacto"><strong>Por qu&eacute; importa</strong><p>${entrada.impacto}</p></div>
          <ul>${renderCapacidades(entrada.capacidades)}</ul>
        </div>
      </article>`).join('');

  const itemList = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Bitácora ActivaQR',
    itemListElement: ENTRADAS_BITACORA.map((entrada, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `${versionVisible(entrada.version)}: ${entrada.titulo}`,
    })),
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Bit&aacute;cora ActivaQR — Evoluci&oacute;n, novedades y capacidades</title>
<meta name="description" content="Conocé la evolución real de ActivaQR: nuevas capacidades, integraciones industriales, pruebas de campo y mejoras publicadas en cada versión." />
<link rel="canonical" href="https://activaqr.net/bitacora/" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://activaqr.net/bitacora/" />
<meta property="og:title" content="Bitácora ActivaQR — El producto avanza y lo mostramos" />
<meta property="og:description" content="Cambios reales, pruebas de campo y nuevas capacidades de ActivaQR." />
<meta property="og:image" content="https://activaqr.net/og-image.png" />
<meta property="og:locale" content="es_AR" />
<script type="application/ld+json">${itemList}</script>
<link rel="icon" type="image/png" href="/favicon.png" />
<style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#0b1120;color:#e6eaf2;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}a{color:inherit}.wrap{width:min(1080px,calc(100% - 40px));margin:0 auto}.aurora{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none;background:radial-gradient(circle at 72% 8%,rgba(20,184,166,.23),transparent 30%),linear-gradient(180deg,#0b1120 0%,#0d1423 55%,#0b1120 100%)}.aurora:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0,transparent 79px,rgba(38,48,63,.22) 80px)}nav{position:sticky;top:0;z-index:10;background:rgba(11,17,32,.82);backdrop-filter:blur(14px);border-bottom:1px solid #26303f}.nav-inner{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:18px}.brand{text-decoration:none;color:#2dd4bf;font-weight:900;letter-spacing:2px;text-transform:uppercase}.nav-actions{display:flex;align-items:center;gap:18px}.nav-link{text-decoration:none;color:#9ca7ba;font-size:13px;font-weight:700}.nav-link:hover{color:#fff}.btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 16px;border:1px solid rgba(45,212,191,.45);border-radius:10px;color:#2dd4bf;text-decoration:none;font-size:13px;font-weight:800}.btn:hover{color:#fff;border-color:#2dd4bf;box-shadow:0 0 18px rgba(45,212,191,.2)}header{padding:96px 0 70px;border-bottom:1px solid #26303f}.eyebrow{margin:0 0 18px;color:#2dd4bf;text-transform:uppercase;letter-spacing:.16em;font-weight:800;font-size:12px}h1{max-width:850px;margin:0;font-size:clamp(42px,8vw,82px);line-height:.98;letter-spacing:-.055em}h1 span{color:#2dd4bf}.intro{max-width:720px;margin:28px 0 0;color:#9ca7ba;font-size:clamp(17px,2.5vw,21px)}.principio{margin-top:38px;display:inline-flex;gap:12px;align-items:center;padding:12px 16px;border:1px solid #26303f;border-radius:999px;background:rgba(20,24,34,.66);color:#cbd5e1;font-size:13px}.pulso{width:9px;height:9px;border-radius:50%;background:#2dd4bf;box-shadow:0 0 0 5px rgba(45,212,191,.12)}main{padding:72px 0 100px}.entrada{display:grid;grid-template-columns:64px minmax(0,1fr);gap:24px;max-width:900px;margin:0 auto 28px}.rail{position:relative;display:flex;justify-content:center}.rail:after{content:"";position:absolute;top:42px;bottom:-29px;width:1px;background:#26303f}.entrada:last-child .rail:after{display:none}.rail span{position:relative;z-index:1;width:42px;height:42px;border:1px solid #26303f;border-radius:50%;display:grid;place-items:center;background:#101827;color:#6b7790;font:700 11px/1 monospace}.entrada-cuerpo{padding:28px;border:1px solid #26303f;border-radius:16px;background:rgba(20,24,34,.72);box-shadow:0 12px 34px rgba(0,0,0,.2)}.entrada.destacada .entrada-cuerpo{border-color:rgba(45,212,191,.45);box-shadow:0 0 28px rgba(45,212,191,.1)}.meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#6b7790;font-size:12px}.version{color:#2dd4bf;font-weight:900;letter-spacing:.08em}.estado{padding:3px 8px;border-radius:999px;background:rgba(45,212,191,.12);color:#5eead4;font-weight:800}.entrada h2{margin:13px 0 12px;font-size:clamp(24px,4vw,36px);line-height:1.12;letter-spacing:-.025em}.resumen{max-width:730px;margin:0;color:#cbd5e1;font-size:17px}.impacto{margin:24px 0 18px;padding:16px 18px;border-left:3px solid #2dd4bf;background:rgba(45,212,191,.06)}.impacto strong{display:block;color:#2dd4bf;text-transform:uppercase;letter-spacing:.1em;font-size:11px}.impacto p{margin:5px 0 0;color:#9ca7ba}.entrada ul{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}.entrada li{padding:7px 11px;border:1px solid #26303f;border-radius:999px;color:#9ca7ba;font-size:12px;font-weight:700}footer{padding:42px 0;border-top:1px solid #26303f;color:#6b7790;font-size:13px}.footer-inner{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}.footer-links{display:flex;gap:16px}.footer-links a{text-decoration:none}.footer-links a:hover{color:#2dd4bf}@media(max-width:640px){.wrap{width:min(100% - 28px,1080px)}.nav-link{display:none}header{padding:68px 0 50px}.principio{align-items:flex-start;border-radius:14px}.pulso{margin-top:6px;flex:none}main{padding:48px 0 72px}.entrada{grid-template-columns:1fr;gap:10px;margin-bottom:32px}.rail{justify-content:flex-start}.rail:after{display:none}.entrada-cuerpo{padding:22px 18px}.entrada ul{display:grid}.entrada li{border-radius:9px}.footer-inner{flex-direction:column}}
</style>
</head>
<body>
<div class="aurora" aria-hidden="true"></div>
<nav><div class="wrap nav-inner"><a class="brand" href="/">ActivaQR</a><div class="nav-actions"><a class="nav-link" href="/">Volver a la portada</a><a class="btn" href="${appUrl}" target="_blank" rel="noopener">Ingresar a la app</a></div></div></nav>
<header><div class="wrap"><p class="eyebrow">Producto vivo &middot; Progreso abierto</p><h1>El producto avanza.<br><span>Nosotros lo mostramos.</span></h1><p class="intro">Esta es la historia verificable de ActivaQR: qu&eacute; cambi&oacute;, qu&eacute; capacidad nueva se incorpor&oacute y por qu&eacute; importa en el trabajo real.</p><div class="principio"><span class="pulso"></span><span>No publicamos promesas como si fueran funciones. Cuando algo est&aacute disponible, entra en esta bit&aacute;cora.</span></div></div></header>
<main><div class="wrap">${entradas}</div></main>
<footer><div class="wrap footer-inner"><span>Hecho en Argentina &middot; &copy; 2026 ActivaQR</span><div class="footer-links"><a href="/">Portada</a><a href="https://api.activaqr.net/politica-privacidad">Privacidad</a></div></div></footer>
</body>
</html>`;
}
