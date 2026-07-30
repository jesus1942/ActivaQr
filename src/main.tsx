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
  const recoveryKey = 'aqr_chunk_recovery'
  const payload = (event as Event & { payload?: unknown }).payload
  const fingerprint = payload instanceof Error
    ? payload.message
    : String(payload ?? 'modulo-desactualizado')

  // Si el mismo módulo falla después de una recuperación, dejamos que Vite
  // propague el error real. Evita convertirlo en `undefined.Dashboard`.
  if (sessionStorage.getItem(recoveryKey) === fingerprint) return

  event.preventDefault()
  sessionStorage.setItem(recoveryKey, fingerprint)

  // Mientras se renueva el módulo, no mostramos la vista ni un error
  // transitorio: el usuario ve el mismo fondo oscuro del arranque.
  document.documentElement.style.backgroundColor = '#020617'
  const root = document.getElementById('root')
  if (root) root.style.visibility = 'hidden'

  const recover = async () => {
    const limpiarCache = 'caches' in window
      ? caches.delete('activaqr-bajo-demanda')
      : Promise.resolve(false)
    const limite = new Promise<boolean>((resolve) => {
      window.setTimeout(() => resolve(false), 750)
    })
    await Promise.race([limpiarCache, limite])
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
