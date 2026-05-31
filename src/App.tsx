import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Activos } from './pages/Activos';
import { ActivoDetalle } from './pages/ActivoDetalle';
import { Medicion } from './pages/Medicion';
import { Mantenimiento } from './pages/Mantenimiento';
import { Reportes } from './pages/Reportes';
import { ImportarDatos } from './pages/ImportarDatos';
import { GestionQR } from './pages/GestionQR';
import { Configuracion } from './pages/Configuracion';
import { Mensajes } from './pages/Mensajes';
import { MensajesAdmin } from './pages/MensajesAdmin';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { FichaPublica } from './pages/FichaPublica';
import { AprobarAccesoRemoto } from './pages/AprobarAccesoRemoto';
import { AuthProvider, useAuth } from './context/AuthContext';

function PantallaBloqueo() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] max-w-md w-full">
        <div className="bg-red-600 px-6 py-4 border-b-4 border-slate-900">
          <h1 className="font-black text-white text-2xl uppercase tracking-wide">
            Cuenta suspendida
          </h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-slate-700 font-semibold text-base leading-relaxed">
            Tu suscripción ha sido suspendida. No podés acceder a la aplicación hasta que el administrador reactive la cuenta.
          </p>
          <p className="text-slate-500 text-sm">
            Si creés que es un error, contactá al soporte de ActivaQR.
          </p>
          <button
            onClick={logout}
            className="w-full mt-2 px-4 py-3 border-2 border-slate-400 font-bold text-slate-600 hover:border-slate-700 transition-colors text-sm uppercase tracking-wide"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthedApp() {
  const { usuario, requiereLogin, empresaSuspendida } = useAuth();

  if (requiereLogin && !usuario) return <Login />;
  if (empresaSuspendida && usuario?.rol !== 'superadmin') return <PantallaBloqueo />;

  const esSuperadmin = usuario?.rol === 'superadmin';

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {esSuperadmin ? (
          <>
            <Route index element={<Admin />} />
            <Route path="admin" element={<Admin />} />
            <Route path="mensajes" element={<MensajesAdmin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route index element={<Dashboard />} />
            <Route path="activos" element={<Activos />} />
            <Route path="activos/:id" element={<ActivoDetalle />} />
            <Route path="medicion" element={<Medicion />} />
            <Route path="medicion/:activoId" element={<Medicion />} />
            <Route path="mantenimiento" element={<Mantenimiento />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="importar" element={<ImportarDatos />} />
            <Route path="qr" element={<GestionQR />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="mensajes" element={<Mensajes />} />
          </>
        )}
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/ficha/:id" element={<FichaPublica />} />
          <Route path="/acceso-remoto/aprobar/:token" element={<AprobarAccesoRemoto />} />
          <Route path="/*" element={<AuthedApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
