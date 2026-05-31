import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ActivaQr/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'ActivaQR — Activos bajo control',
        short_name: 'ActivaQR',
        description: 'Gestión inteligente de activos industriales con QR, mediciones y mantenimiento predictivo',
        theme_color: '#F97316',
        background_color: '#1E293B',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/ActivaQr/',
        scope: '/ActivaQr/',
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
            url: '/ActivaQr/#/medicion',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }]
          },
          {
            name: 'Ver Activos',
            short_name: 'Activos',
            description: 'Lista de activos',
            url: '/ActivaQr/#/activos',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
          }
        ]
      }
    })
  ],
})
