// v1.1.0
import { HashRouter as BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { PantallaTrialVencido, SeccionTracker } from './components/TrialUI';
import { PantallaAceptarPoliticas } from './components/PantallaAceptarPoliticas';
import { SplashScreen } from './components/SplashScreen';
import { ErrorBoundary, RutaProtegida } from './components/ErrorBoundary';
import { useState, useCallback } from 'react';
import { prepararInicio } from './data/startup';
import { ActivosProvider } from './hooks/useActivos';
import { esTecnico, puedeVerModulo, type ModuloEmpresa } from './data/permisos';

const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Indicadores = lazy(() => import('./pages/Indicadores').then((m) => ({ default: m.Indicadores })));
const Auditoria = lazy(() => import('./pages/Auditoria').then((m) => ({ default: m.Auditoria })));
const Activos = lazy(() => import('./pages/Activos').then((m) => ({ default: m.Activos })));
const ActivoDetalle = lazy(() => import('./pages/ActivoDetalle').then((m) => ({ default: m.ActivoDetalle })));
const Medicion = lazy(() => import('./pages/Medicion').then((m) => ({ default: m.Medicion })));
const Mantenimiento = lazy(() => import('./pages/Mantenimiento').then((m) => ({ default: m.Mantenimiento })));
const Reportes = lazy(() => import('./pages/Reportes').then((m) => ({ default: m.Reportes })));
const ImportarDatos = lazy(() => import('./pages/ImportarDatos').then((m) => ({ default: m.ImportarDatos })));
const GestionQR = lazy(() => import('./pages/GestionQR').then((m) => ({ default: m.GestionQR })));
const Configuracion = lazy(() => import('./pages/Configuracion').then((m) => ({ default: m.Configuracion })));
const Mensajes = lazy(() => import('./pages/Mensajes').then((m) => ({ default: m.Mensajes })));
const MensajesAdmin = lazy(() => import('./pages/MensajesAdmin').then((m) => ({ default: m.MensajesAdmin })));
const AdminTestimonios = lazy(() => import('./pages/AdminTestimonios').then((m) => ({ default: m.AdminTestimonios })));
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));
const Analitica = lazy(() => import('./pages/Analitica').then((m) => ({ default: m.Analitica })));
const CotizacionesAdmin = lazy(() => import('./pages/CotizacionesAdmin').then((m) => ({ default: m.CotizacionesAdmin })));
const CotizacionesCliente = lazy(() => import('./pages/CotizacionesCliente').then((m) => ({ default: m.CotizacionesCliente })));
const Correctivos = lazy(() => import('./pages/Correctivos').then((m) => ({ default: m.Correctivos })));
const FichaPublica = lazy(() => import('./pages/FichaPublica').then((m) => ({ default: m.FichaPublica })));
const AprobarAccesoRemoto = lazy(() => import('./pages/AprobarAccesoRemoto').then((m) => ({ default: m.AprobarAccesoRemoto })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const DashboardOperador = lazy(() => import('./pages/DashboardOperador').then((m) => ({ default: m.DashboardOperador })));
const PresentacionComercial = lazy(() => import('./pages/PresentacionComercial').then((m) => ({ default: m.PresentacionComercial })));
const ControlIndustrial = lazy(() => import('./pages/ControlIndustrial').then((m) => ({ default: m.ControlIndustrial })));
const ControlIndustrialAdmin = lazy(() => import('./pages/ControlIndustrialAdmin').then((m) => ({ default: m.ControlIndustrialAdmin })));
const Camaras = lazy(() => import('./pages/Camaras').then((m) => ({ default: m.Camaras })));

function AppConSplash() {
  const [inicioListo, setInicioListo] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    let vigente = true;
    prepararInicio().finally(() => {
      if (vigente) setInicioListo(true);
    });
    return () => { vigente = false; };
  }, []);

  const onDone = useCallback(() => {
    setSplashDone(true);
  }, []);

  return (
    <>
      {!splashDone && <SplashScreen ready={inicioListo} onDone={onDone} />}
      {inicioListo && <AppInterna />}
    </>
  );
}

function PantallaBloqueo() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-surface border border-line shadow-soft max-w-md w-full">
        <div className="bg-danger px-6 py-4 border-b-4 border-line">
          <h1 className="font-black text-white text-2xl uppercase tracking-wide">
            Cuenta suspendida
          </h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-content font-semibold text-base leading-relaxed">
            Tu suscripción ha sido suspendida. No podés acceder a la aplicación hasta que el administrador reactive la cuenta.
          </p>
          <p className="text-muted text-sm">
            Si creés que es un error, contactá al soporte de ActivaQR.
          </p>
          <button
            onClick={logout}
            className="w-full mt-2 px-4 py-3 border border-line-strong font-bold text-muted hover:border-content transition-colors text-sm uppercase tracking-wide"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthedApp() {
  const { usuario, requiereLogin, empresaSuspendida, trialVencido, estadoPoliticas, refrescarEstadoPoliticas } = useAuth();

  if (requiereLogin && !usuario) return <Login />;
  if (empresaSuspendida && usuario?.rol !== 'superadmin') return <PantallaBloqueo />;
  if (trialVencido && usuario?.rol !== 'superadmin') return <PantallaTrialVencido />;

  // Aceptacion de politicas obligatoria antes de seguir.
  // Solo aplica a empresas (no al superadmin) y solo si el endpoint respondio
  // que la empresa todavia no acepta la version vigente.
  if (
    usuario &&
    usuario.rol !== 'superadmin' &&
    estadoPoliticas?.requiereAceptarPoliticas
  ) {
    return <PantallaAceptarPoliticas onAceptada={refrescarEstadoPoliticas} />;
  }

  if (esTecnico(usuario?.rol)) return <RutaProtegida scope="Dashboard del técnico"><DashboardOperador /></RutaProtegida>;

  const esSuperadmin = usuario?.rol === 'superadmin';
  const esDireccion = usuario?.rol === 'direccion';
  const conAcceso = (modulo: ModuloEmpresa, scope: string, pagina: JSX.Element) =>
    puedeVerModulo(usuario?.rol, modulo)
      ? <RutaProtegida scope={scope}>{pagina}</RutaProtegida>
      : <Navigate to="/" replace />;

  const rutas = (
    <Routes>
      <Route path="/" element={<Layout />}>
        {esSuperadmin ? (
          <>
            <Route index element={<RutaProtegida scope="Administracion"><Admin /></RutaProtegida>} />
            <Route path="admin" element={<RutaProtegida scope="Administracion"><Admin /></RutaProtegida>} />
            <Route path="analitica" element={<RutaProtegida scope="Analitica"><Analitica /></RutaProtegida>} />
            <Route path="cotizaciones" element={<RutaProtegida scope="Cotizaciones"><CotizacionesAdmin /></RutaProtegida>} />
            <Route path="correctivos" element={<RutaProtegida scope="Alertas y ordenes"><Correctivos /></RutaProtegida>} />
            <Route path="mensajes" element={<RutaProtegida scope="Mensajes"><MensajesAdmin /></RutaProtegida>} />
            <Route path="testimonios" element={<RutaProtegida scope="Testimonios"><AdminTestimonios /></RutaProtegida>} />
            <Route path="presentacion" element={<RutaProtegida scope="Presentacion comercial"><PresentacionComercial /></RutaProtegida>} />
            <Route path="control-industrial" element={<RutaProtegida scope="ActivaQR Control"><ControlIndustrialAdmin /></RutaProtegida>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route index element={esDireccion ? conAcceso('indicadores', 'Indicadores', <Indicadores />) : conAcceso('dashboard', 'Dashboard', <Dashboard />)} />
            <Route path="indicadores" element={conAcceso('indicadores', 'Indicadores', <Indicadores />)} />
            <Route path="auditoria" element={conAcceso('auditoria', 'Auditoria', <Auditoria />)} />
            <Route path="activos" element={conAcceso('activos', 'Activos', <Activos />)} />
            <Route path="activos/:id" element={conAcceso('activos', 'Detalle del activo', <ActivoDetalle />)} />
            <Route path="medicion" element={conAcceso('medicion', 'Medicion', <Medicion />)} />
            <Route path="medicion/:activoId" element={conAcceso('medicion', 'Medicion', <Medicion />)} />
            <Route path="mantenimiento" element={conAcceso('mantenimiento', 'Mantenimiento', <Mantenimiento />)} />
            <Route path="reportes" element={conAcceso('reportes', 'Reportes', <Reportes />)} />
            <Route path="importar" element={conAcceso('importar', 'Importar datos', <ImportarDatos />)} />
            <Route path="qr" element={conAcceso('qr', 'Gestion QR', <GestionQR />)} />
            <Route path="configuracion" element={conAcceso('configuracion', 'Configuracion', <Configuracion />)} />
            <Route path="mensajes" element={conAcceso('mensajes', 'Mensajes', <Mensajes />)} />
            <Route path="cotizaciones" element={conAcceso('cotizaciones', 'Cotizaciones', <CotizacionesCliente />)} />
            <Route path="correctivos" element={conAcceso('correctivos', 'Alertas y ordenes', <Correctivos />)} />
            <Route path="control-industrial" element={conAcceso('control_industrial', 'ActivaQR Control', <ControlIndustrial />)} />
            <Route path="camaras" element={conAcceso('camaras', 'ActivaQR Cámaras', <Camaras />)} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  const rutasConDatos = !usuario || (!esSuperadmin && !esTecnico(usuario.rol))
    ? <ActivosProvider>{rutas}</ActivosProvider>
    : rutas;

  return (
    <>
      <SeccionTracker />
      {rutasConDatos}
    </>
  );
}

function AppInterna() {
  return (
    <ErrorBoundary variant="full" scope="la app">
      <ThemeProvider>
       <ToastProvider>
        <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<div className="min-h-screen bg-slate-950" aria-label="Cargando" />}>
            <Routes>
              <Route path="/ficha/:id" element={<RutaProtegida scope="Ficha publica"><FichaPublica /></RutaProtegida>} />
              <Route path="/acceso-remoto/aprobar/:token" element={<RutaProtegida scope="Aprobacion de acceso remoto"><AprobarAccesoRemoto /></RutaProtegida>} />
              <Route path="/reset-password" element={<RutaProtegida scope="Reset de contrasena"><ResetPassword /></RutaProtegida>} />
              <Route path="/*" element={<AuthedApp />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </AuthProvider>
       </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default AppConSplash;
