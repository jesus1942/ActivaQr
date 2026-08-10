// v1.1.0
// Navegación principal:
//  · Desktop → sidebar lateral limpio (tokens del design system)
//  · Mobile  → bottom navigation + hoja "Más" con el resto de accesos
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wrench,
  FileText,
  Upload,
  QrCode,
  Settings,
  Building2,
  LogOut,
  MessageSquare,
  BarChart3,
  ScrollText,
  LineChart,
  Lock,
  Star,
  MoreHorizontal,
  User,
  ScanLine,
  FileSignature,
  AlertOctagon,
  Presentation,
  RadioTower,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotificacionesCliente } from '../../data/accesoRemotoApi';
import { hasFeature, type Feature } from '../../data/planes';
import { Sheet } from '../ui/Sheet';
import { ThemeToggle } from '../ui/ThemeToggle';
import { etiquetaRol, puedeVerModulo, type ModuloEmpresa } from '../../data/permisos';
import { estadoControl } from '../../data/controlIndustrialApi';

const LOGO_LIGHT = `${import.meta.env.BASE_URL}company-logo-hd.png`;   // negro, fondo claro
const LOGO_DARK  = `${import.meta.env.BASE_URL}company-logo1.png`;      // claro, fondo oscuro

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  sub?: string;
  feature?: Feature;
  modulo?: ModuloEmpresa;
  requiresControl?: boolean;
}

const navEmpresa: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', sub: 'Resumen del día', modulo: 'dashboard' },
  { to: '/cotizaciones', icon: FileSignature, label: 'Cotizaciones', sub: 'Propuestas de ActivaQR', modulo: 'cotizaciones' },
  { to: '/correctivos', icon: AlertOctagon, label: 'Alertas y órdenes', sub: 'Correctivos autorizados', modulo: 'correctivos' },
  { to: '/control-industrial', icon: RadioTower, label: 'Control industrial', sub: 'Equipos y alarmas en vivo', modulo: 'control_industrial', requiresControl: true },
  { to: '/indicadores', icon: BarChart3, label: 'Indicadores', sub: 'KPIs y gráficos', feature: 'indicadores', modulo: 'indicadores' },
  { to: '/activos', icon: Package, label: 'Activos', sub: 'Tus equipos', modulo: 'activos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones', sub: 'Cargar lectura', modulo: 'medicion' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento', sub: 'Tareas y planes', modulo: 'mantenimiento' },
  { to: '/reportes', icon: FileText, label: 'Reportes', sub: 'Exportar PDF/CSV', modulo: 'reportes' },
  { to: '/auditoria', icon: ScrollText, label: 'Auditoría', sub: 'Quién hizo qué', feature: 'auditoria', modulo: 'auditoria' },
  { to: '/importar', icon: Upload, label: 'Importar Datos', sub: 'Carga masiva', modulo: 'importar' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas', sub: 'Imprimir códigos', modulo: 'qr' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes', modulo: 'mensajes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración', sub: 'Sectores, tipos y perfiles', modulo: 'configuracion' },
];

const navSuperadmin: NavItem[] = [
  { to: '/', icon: Building2, label: 'Empresas' },
  { to: '/presentacion', icon: Presentation, label: 'Presentación', sub: 'Demo para potenciales clientes' },
  { to: '/control-industrial', icon: RadioTower, label: 'Control industrial', sub: 'Licencias y conectividad' },
  { to: '/cotizaciones', icon: FileSignature, label: 'Cotizaciones', sub: 'Crear, enviar y responder' },
  { to: '/correctivos', icon: AlertOctagon, label: 'Alertas y órdenes', sub: 'Riesgo, permisos y trabajos' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/analitica', icon: LineChart, label: 'Analítica' },
  { to: '/testimonios', icon: Star, label: 'Testimonios', sub: 'Moderar landing' },
];

// Destinos de la bottom nav (mobile, empresa). El último abre la hoja "Más".
const bottomPrimarySuperadmin = ['/', '/presentacion', '/mensajes'];

export const Sidebar: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [notif, setNotif] = useState({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
  const [controlHabilitado, setControlHabilitado] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuth();

  const esSuperadmin = usuario?.rol === 'superadmin';
  useEffect(() => {
    if (!usuario || esSuperadmin) { setControlHabilitado(false); return; }
    estadoControl().then((result) => setControlHabilitado(result.habilitado)).catch(() => setControlHabilitado(false));
  }, [usuario, esSuperadmin]);
  const navItems = esSuperadmin
    ? navSuperadmin
    : usuario?.rol === 'direccion'
      ? [
          { to: '/', icon: BarChart3, label: 'Dirección', sub: 'Riesgo y decisiones', modulo: 'indicadores' as const },
          ...navEmpresa.filter((item) => item.to !== '/' && item.to !== '/indicadores' && (!item.requiresControl || controlHabilitado) && (!item.modulo || puedeVerModulo(usuario.rol, item.modulo))),
        ]
      : navEmpresa.filter((item) => (!item.requiresControl || controlHabilitado) && (!item.modulo || puedeVerModulo(usuario?.rol, item.modulo)));
  const planActual = usuario?.empresa?.plan ?? 'inicial';
  const bottomPrimary = esSuperadmin
    ? bottomPrimarySuperadmin
    : usuario?.rol === 'direccion'
      ? ['/', '/activos', '/reportes']
      : ['/', '/activos', '/medicion'];

  // Polling de notificaciones (empresa/industrial).
  useEffect(() => {
    if (!usuario || usuario.rol === 'superadmin') return;
    const plan = usuario.empresa?.plan ?? '';
    if (!['empresa', 'industrial'].includes(plan)) return;
    const cargar = () => getNotificacionesCliente().then(setNotif).catch(() => {});
    cargar();
    const iv = setInterval(cargar, 30_000);
    return () => clearInterval(iv);
  }, [usuario]);

  const notificationFor = (to: string): number | string => {
    if (to !== '/mensajes') return 0;
    return notif.mensajesNoLeidos > 0
      ? notif.mensajesNoLeidos
      : notif.tienePermisoPendiente
      ? '!'
      : 0;
  };

  const itemDisabled = (item: NavItem) => (item.feature ? !hasFeature(planActual, item.feature) : false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'group relative flex items-center gap-3 px-3.5 py-2 min-h-[48px] rounded-md font-medium text-sm transition-all duration-200',
      isActive
        ? 'bg-brand-600 text-white shadow-soft'
        : 'text-muted hover:text-content hover:bg-subtle',
    ].join(' ');

  // ── Sidebar de escritorio ─────────────────────────────────
  const desktopSidebar = (
    <aside className="hidden md:flex md:flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-canvas border-r border-line">
      <div className="px-5 py-6 flex items-center gap-3">
        <img src={LOGO_LIGHT} alt="ActivaQR" className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.5)] dark:hidden" />
        <img src={LOGO_DARK} alt="ActivaQR" className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(45,212,191,0.5)] hidden dark:block" />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4">
        {navItems.map((item) => {
          const { to, icon: Icon, label, sub } = item;
          const notification = notificationFor(to);
          const bloqueado = itemDisabled(item);
          return (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 min-w-0 leading-tight">
                <span className="block">{label}</span>
                {sub && <span className="block text-[11px] font-normal opacity-70 truncate group-[.bg-brand-600]:opacity-80">{sub}</span>}
              </span>
              {bloqueado && <Lock size={13} className="shrink-0 opacity-60" />}
              {!!notification && (
                <span className="text-[11px] font-bold text-danger shrink-0">{notification}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-line space-y-3">
        {usuario ? (
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-300 shrink-0">
              <User size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-content text-sm font-semibold truncate">
                {usuario.empresa?.nombre ?? (esSuperadmin ? 'ActivaQR · Admin' : usuario.nombre)}
              </div>
              <div className="text-faint text-xs font-mono truncate">{usuario.email}</div>
              {!esSuperadmin && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600 truncate">
                  {etiquetaRol(usuario.rol)}
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-faint text-xs font-mono">Modo demo (local)</span>
            <ThemeToggle />
          </div>
        )}
        {usuario && (
          <button
            onClick={logout}
            className="press flex items-center gap-2 text-muted hover:text-danger text-sm font-medium transition-colors"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        )}
        <a
          href="https://portfolio-production-1f23.up.railway.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-faint hover:text-brand-600 text-[11px] font-mono transition-colors"
        >
          v1.4.0 · dev Jesús Olguín
        </a>
      </div>
    </aside>
  );

  // ── Header de mobile ──────────────────────────────────────
  const mobileHeader = (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-line flex items-center justify-between px-4 h-14 box-content safe-top">
      <img src={LOGO_LIGHT} alt="ActivaQR" className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(45,212,191,0.55)] dark:hidden" />
      <img src={LOGO_DARK} alt="ActivaQR" className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(45,212,191,0.55)] hidden dark:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {!esSuperadmin && puedeVerModulo(usuario?.rol, 'medicion') && (
          <button
            onClick={() => navigate('/medicion')}
            className="press grid place-items-center w-10 h-10 rounded-full bg-brand-600 text-white shadow-soft"
            title="Nueva medición"
          >
            <ScanLine size={18} />
          </button>
        )}
        {/* Salir siempre a mano en el celular: el superadmin no tiene la hoja
            "Mas", que era el unico lugar con cerrar sesion. */}
        {usuario && (
          <button
            onClick={logout}
            className="press grid place-items-center w-10 h-10 rounded-full border border-line text-danger"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </header>
  );

  // ── Bottom navigation (mobile) ────────────────────────────
  const bottomItems = esSuperadmin
    ? navSuperadmin.filter((i) => bottomPrimarySuperadmin.includes(i.to))
    : navItems.filter((i) => bottomPrimary.includes(i.to));
  const mobilePrimary = bottomPrimary;
  const isMoreActive = !mobilePrimary.includes(location.pathname);

  const bottomNav = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-line safe-bottom">
      <div className="flex items-stretch justify-around h-[4.5rem] px-2">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'press flex flex-col items-center justify-center gap-1 flex-1 rounded-md transition-colors',
                isActive ? 'text-brand-600' : 'text-faint hover:text-muted',
              ].join(' ')
            }
          >
            <Icon size={22} />
            <span className="text-[11px] font-medium">{label}</span>
          </NavLink>
        ))}
        {navItems.length > bottomItems.length && (
          <button
            onClick={() => setMoreOpen(true)}
            className={[
              'press flex flex-col items-center justify-center gap-1 flex-1 rounded-md transition-colors',
              isMoreActive ? 'text-brand-600' : 'text-faint hover:text-muted',
            ].join(' ')}
          >
            <MoreHorizontal size={22} />
            <span className="text-[11px] font-medium">Más</span>
          </button>
        )}
      </div>
    </nav>
  );

  // ── Hoja "Más" con el resto de accesos ────────────────────
  const moreSheet = (
    <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menú" side="bottom">
      <div className="grid grid-cols-3 gap-3 pb-2">
        {navItems
          .filter((i) => !mobilePrimary.includes(i.to))
          .map((item) => {
            const { to, icon: Icon, label } = item;
            const notification = notificationFor(to);
            const bloqueado = itemDisabled(item);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  [
                    'relative flex flex-col items-center justify-center gap-2 py-4 rounded-md border transition-all',
                    isActive
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                      : 'border-line text-muted hover:border-line-strong hover:text-content',
                  ].join(' ')
                }
              >
                <Icon size={22} />
                <span className="text-xs font-medium text-center leading-tight">{label}</span>
                {bloqueado && <Lock size={12} className="absolute top-2 left-2 opacity-50" />}
                {!!notification && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-danger">{notification}</span>
                )}
              </NavLink>
            );
          })}
      </div>
      {usuario && (
        <button
          onClick={() => { setMoreOpen(false); logout(); }}
          className="press mt-4 w-full flex items-center justify-center gap-2 h-11 rounded-md border border-line text-danger font-medium text-sm"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      )}
    </Sheet>
  );

  return (
    <>
      {mobileHeader}
      {desktopSidebar}
      {bottomNav}
      {moreSheet}
    </>
  );
};
