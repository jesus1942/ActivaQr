import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// La app se sirve bajo /app/ en el dominio propio: la raiz la ocupa la landing
// (ver scripts/build-site.mjs). VITE_BASE permite otra ubicacion — por ejemplo
// '/ActivaQr/' para publicar en GitHub Pages sin dominio propio.
const base = process.env.VITE_BASE || '/app/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // og-image queda afuera: solo se usa en las vistas previas de WhatsApp y
      // redes, que la piden desde la raiz del dominio, nunca desde la app.
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'ActivaQR — Activos bajo control',
        short_name: 'ActivaQR',
        description: 'Gestión inteligente de activos industriales con QR, mediciones y mantenimiento predictivo',
        theme_color: '#14B8A6',
        background_color: '#0B1120',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        lang: 'es',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-72.png',   sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96.png',   sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128.png',  sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png',  sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png',  sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-384.png',  sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Tomar Medición',
            short_name: 'Medición',
            description: 'Cargar medición desde campo',
            url: `${base}#/medicion`,
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }]
          },
          {
            name: 'Ver Activos',
            short_name: 'Activos',
            description: 'Lista de activos',
            url: `${base}#/activos`,
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Lo que NO se precarga al instalar la app. Se descarga la primera vez
        // que se usa y queda cacheado (ver runtimeCaching). El objetivo es que
        // el tecnico en el campo tenga offline lo que necesita —cargar
        // mediciones— sin esperar megas de librerias que quiza no abra nunca.
        globIgnores: [
          'og-image.png',                    // solo para previews de WhatsApp y redes
          'assets/jspdf*.js',                // exportar PDF
          'assets/html2canvas*.js',          // capturas para el PDF
          'assets/generateCategoricalChart*.js', // graficos de analitica
          'assets/index.es-*.js',            // dependencia de los graficos
          'assets/purify.es-*.js',           // saneado de HTML para el PDF
        ],
        globIgnores: [
          '**/jspdf*.js',
          '**/html2canvas*.js',
          '**/generateCategoricalChart*.js',
          '**/purify*.js',
        ],
        importScripts: ['push-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          },
          {
            // Lo excluido del precache: se guarda al primer uso y desde ahi
            // queda disponible sin conexion.
            urlPattern: ({ request, sameOrigin }) => sameOrigin && (request.destination === 'script' || request.destination === 'image'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'activaqr-bajo-demanda', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ],
})
