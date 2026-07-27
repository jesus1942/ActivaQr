/**
 * Arma el sitio publico de activaqr.net a partir de dos piezas:
 *
 *   dist/index.html   landing comercial (misma fuente que sirve Railway)
 *   dist/app/         aplicacion React, ya compilada por Vite con base /app/
 *
 * Motivo: la landing es el contenido que Google indexa y que ve alguien que
 * todavia no es cliente. La app es una pantalla de login sin texto util para
 * un buscador. Antes estaban al reves — la landing vivia en el subdominio de
 * la API y el dominio principal servia la app.
 *
 * Compatibilidad: los QR ya impresos apuntan a activaqr.net/#/ficha/<id>.
 * La landing detecta ese hash y redirige a /app/ conservando el destino, asi
 * que ningun QR impreso deja de funcionar.
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const SITIO = 'https://activaqr.net';
const APP = `${SITIO}/app/`;

if (!existsSync(join(dist, 'app', 'index.html'))) {
  console.error('Falta dist/app/index.html — primero hay que compilar la app (npm run build:app).');
  process.exit(1);
}

// ── Landing ────────────────────────────────────────────────────────────────
const { renderLanding } = await import(
  new URL('../server/dist/src/landing.js', import.meta.url).href
);

const whatsapp = process.env.WHATSAPP_NUMERO || '5492804018359';
let landing = renderLanding(APP, whatsapp, {
  cafecito: process.env.APOYO_CAFECITO_URL,
  mp: process.env.APOYO_MP_URL,
  stripe: process.env.APOYO_STRIPE_URL,
});

// Rescate de QR viejos: cualquier hash de ruta que caiga en la raiz se
// reenvia a la app. Va lo mas arriba posible para que no llegue a pintar.
const redireccion = `<script>
(function () {
  var h = window.location.hash;
  if (h && h.indexOf('#/') === 0) {
    window.location.replace('/app/' + h);
  }
})();
</script>`;
landing = landing.replace('<head>', `<head>\n${redireccion}`);

// La canonica ya viene del template apuntando a activaqr.net: el mismo
// contenido lo sirve tambien api.activaqr.net y esta es la version indexable.
if (!landing.includes(`<link rel="canonical" href="${SITIO}/" />`)) {
  console.error(`La landing no declara la canonica ${SITIO}/ — revisar landing.ts`);
  process.exit(1);
}

writeFileSync(join(dist, 'index.html'), landing);

// ── 404: GitHub Pages entra aca ante cualquier ruta desconocida ────────────
// Manda a la app las rutas que le corresponden y a la landing el resto.
writeFileSync(
  join(dist, '404.html'),
  `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>ActivaQR</title>
  <script>
    (function () {
      var l = window.location;
      var esApp = l.pathname.indexOf('/app') === 0 || (l.hash && l.hash.indexOf('#/') === 0);
      l.replace(esApp ? '/app/' + (l.hash || '') : '/');
    })();
  </script>
</head>
<body></body>
</html>
`
);

// ── Service worker viejo ───────────────────────────────────────────────────
// Hasta ahora la app vivia en la raiz y dejo un service worker con alcance "/"
// en el navegador de cada usuario. Si no se desactiva, sigue sirviendo la app
// cacheada en lugar de la landing. Este lo reemplaza y se da de baja solo.
writeFileSync(
  join(dist, 'sw.js'),
  `// La app se mudo a /app/. Este service worker solo se da de baja a si mismo
// y limpia lo que habia cacheado en la raiz.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (cs) { cs.forEach(function (c) { c.navigate(c.url); }); })
  );
});
`
);

// ── Archivos que deben vivir en la raiz del dominio ────────────────────────
// La landing referencia el logo y la miniatura desde la raiz del dominio
// (og:image, favicon): sin estas copias quedaban en 404 y las vistas previas
// de WhatsApp y LinkedIn salian sin imagen.
const aLaRaiz = [
  'robots.txt',
  'sitemap.xml',
  'favicon.png',
  'og-image.png',
  'apple-touch-icon.png',
  'company-logo-hd.png',
  'company-logo1.png',
  'company-logo.png',
];
for (const archivo of aLaRaiz) {
  const origen = join(dist, 'app', archivo);
  if (existsSync(origen)) copyFileSync(origen, join(dist, archivo));
}

// Sitemap propio del sitio: la landing es lo unico indexable.
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITIO}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`
);
writeFileSync(
  join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /app/\n\nSitemap: ${SITIO}/sitemap.xml\n`
);

console.log('Sitio armado:');
console.log('  dist/index.html   landing (indexable, con rescate de QR viejos)');
console.log('  dist/app/         aplicacion React');
console.log('  dist/sw.js        baja del service worker anterior');
