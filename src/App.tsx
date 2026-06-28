// v1.1.0
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
import { ResetPassword } from './pages/ResetPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { DashboardOperador } from './pages/DashboardOperador';

function PantallaBloqueo() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-xl shadow-soft max-w-md w-full overflow-hidden animate-scale-in">
        <div className="bg-danger px-6 py-5">
          <h1 className="font-display text-white text-xl font-bold">
            Cuenta suspendida
          </h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-content font-medium text-base leading-relaxed">
            Tu suscripción ha sido suspendida. No podés acceder a la aplicación hasta que el administrador reactive la cuenta.
          </p>
          <p className="text-muted text-sm">
            Si creés que es un error, contactá al soporte de ActivaQR.
          </p>
          <button
            onClick={logout}
            className="press w-full mt-2 px-4 py-3 rounded-md border border-line-strong font-semibold text-muted hover:text-content hover:border-content transition-colors text-sm"
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

  if (usuario?.rol === 'operador') return <DashboardOperador />;

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
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/ficha/:id" element={<FichaPublica />} />
              <Route path="/acceso-remoto/aprobar/:token" element={<AprobarAccesoRemoto />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/*" element={<AuthedApp />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
