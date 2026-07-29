// v1.1.0
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ensureSeed } from './data/store'

// Cuando se publica una versión nueva, una pestaña/PWA que seguía abierta
// puede intentar importar un chunk con hash anterior que ya no existe.
// Vite emite este evento antes de mostrar "Importing a module script failed".
// Limpiamos sólo el cache de módulos bajo demanda y recargamos una única vez.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const recoveryKey = 'aqr_chunk_recovery'
  if (sessionStorage.getItem(recoveryKey) === '1') return
  sessionStorage.setItem(recoveryKey, '1')

  const recover = async () => {
    if ('caches' in window) {
      await caches.delete('activaqr-bajo-demanda')
    }
    window.location.reload()
  }
  void recover()
})

// Una navegación correcta vuelve a habilitar la recuperación para una futura
// publicación, sin crear bucles si el servidor realmente está caído.
window.addEventListener('load', () => {
  window.setTimeout(() => sessionStorage.removeItem('aqr_chunk_recovery'), 10_000)
})

// Si la URL tiene ?demo=1 limpiar sesión antes de renderizar nada
if (window.location.hash.includes('demo=1')) {
  // La sesion vive en localStorage; se limpia sessionStorage tambien por si
  // el dispositivo trae una sesion de una version anterior de la app.
  localStorage.removeItem('activaqr_token');
  localStorage.removeItem('activaqr_user');
  sessionStorage.removeItem('activaqr_token');
  sessionStorage.removeItem('activaqr_user');
}

// Inicializa localStorage con los seeds (incluye sectores, tipos y técnicos)
// si las claves aún no existen.
ensureSeed()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
