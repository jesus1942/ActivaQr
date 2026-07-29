// v1.1.0
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ensureSeed } from './data/store'

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
