// v1.1.0
// Navegación principal:
//  · Desktop → sidebar lateral minimalista (rail con todos los accesos)
//  · Mobile  → bottom navigation con 4 destinos clave + hoja "Más"
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
  MoreHorizontal,
  User,
  ScanLine,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotificacionesCliente } from '../../data/accesoRemotoApi';
import { Sheet } from '../ui/Sheet';
import { ThemeToggle } from '../ui/ThemeToggle';

const LOGO_LIGHT = '/ActivaQr/company-logo-hd.png';   // negro, fondo claro
const LOGO_DARK  = '/ActivaQr/company-logo1.png';      // claro, fondo oscuro

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const navEmpresa: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/activos', icon: Package, label: 'Activos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { to: '/reportes', icon: FileText, label: 'Reportes' },
  { to: '/importar', icon: Upload, label: 'Importar' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const navSuperadmin: NavItem[] = [
  { to: '/', icon: Building2, label: 'Empresas' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
];

// Destinos de la bottom nav (mobile). El 4º abre la hoja "Más".
const bottomPrimary: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/activos', icon: Package, label: 'Activos' },
  { to: '/reportes', icon: FileText, label: 'Reportes' },
];

export const Sidebar: React.FC = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [notif, setNotif] = useState({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuth();

  const esSuperadmin = usuario?.rol === 'superadmin';
  const navItems = esSuperadmin ? navSuperadmin : navEmpresa;

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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'group relative flex items-center gap-3 px-3.5 h-11 rounded-md font-medium text-sm transition-all duration-200',
      isActive
        ? 'bg-brand-600 text-white shadow-soft'
        : 'text-muted hover:text-content hover:bg-subtle',
    ].join(' ');

  // ── Sidebar de escritorio ─────────────────────────────────
  const desktopSidebar = (
    <aside className="hidden md:flex md:flex-col w-64 flex-shrink-0 h-screen sticky top-0 bg-canvas border-r border-line">
      <div className="px-5 py-6 flex items-center gap-3">
        <img src={LOGO_LIGHT} alt="ActivaQR" className="h-9 w-auto object-contain dark:hidden" />
        <img src={LOGO_DARK} alt="ActivaQR" className="h-9 w-auto object-contain hidden dark:block" />
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const notification = notificationFor(to);
          return (
            <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
              <Icon size={18} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {!!notification && (
                <span className="text-[11px] font-bold text-danger">
                  {notification}
                </span>
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
        <div className="text-faint text-[11px] font-mono pt-1">v1.1.0</div>
      </div>
    </aside>
  );

  // ── Header de mobile (logo + acción rápida + tema) ────────
  const mobileHeader = (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 glass border-b border-line flex items-center justify-between px-4 h-14 box-content safe-top">
      <img src={LOGO_LIGHT} alt="ActivaQR" className="h-7 w-auto object-contain dark:hidden" />
      <img src={LOGO_DARK} alt="ActivaQR" className="h-7 w-auto object-contain hidden dark:block" />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => navigate('/medicion')}
          className="press grid place-items-center w-10 h-10 rounded-full bg-brand-600 text-white shadow-soft"
          title="Nueva medición"
        >
          <ScanLine size={18} />
        </button>
      </div>
    </header>
  );

  // ── Bottom navigation (mobile) ────────────────────────────
  const isMoreActive = !['/', '/activos', '/reportes'].includes(location.pathname);
  const bottomItems = esSuperadmin ? navSuperadmin : bottomPrimary;

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
        {!esSuperadmin && (
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
          .filter((i) => !['/', '/activos', '/reportes'].includes(i.to))
          .map(({ to, icon: Icon, label }) => {
            const notification = notificationFor(to);
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
                {!!notification && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold text-danger">
                    {notification}
                  </span>
                )}
              </NavLink>
            );
          })}
      </div>
      {usuario && (
        <button
          onClick={() => {
            setMoreOpen(false);
            logout();
          }}
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
