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
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppRoutes() {
  const { usuario, requiereLogin } = useAuth();

  // Modo API sin sesión → pantalla de login.
  if (requiereLogin && !usuario) {
    return <Login />;
  }

  const esSuperadmin = usuario?.rol === 'superadmin';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {esSuperadmin ? (
            <>
              {/* El superadmin solo ve el panel de administración. */}
              <Route index element={<Admin />} />
              <Route path="admin" element={<Admin />} />
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
            </>
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
