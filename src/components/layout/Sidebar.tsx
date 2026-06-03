// v1.1.0
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Menu,
  X,
  MessageSquare,
  BarChart3,
  ScrollText,
  LineChart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotificacionesCliente } from '../../data/accesoRemotoApi';

const LOGO_LIGHT = '/ActivaQr/company-logo-hd.png';   // negro, para fondo claro
const LOGO_DARK  = '/ActivaQr/company-logo1.png';      // claro, para fondo oscuro (sidebar navy)

const navEmpresa = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/indicadores', icon: BarChart3, label: 'Indicadores' },
  { to: '/activos', icon: Package, label: 'Activos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { to: '/reportes', icon: FileText, label: 'Reportes' },
  { to: '/auditoria', icon: ScrollText, label: 'Auditoría' },
  { to: '/importar', icon: Upload, label: 'Importar Datos' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

const navSuperadmin = [
  { to: '/', icon: Building2, label: 'Empresas' },
  { to: '/analitica', icon: LineChart, label: 'Analítica' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
];

export const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const navItems = usuario?.rol === 'superadmin' ? navSuperadmin : navEmpresa;

  // Polling de notificaciones para clientes con plan empresa/industrial.
  useEffect(() => {
    if (!usuario || usuario.rol === 'superadmin') return;
    const plan = usuario.empresa?.plan ?? '';
    if (!['empresa', 'industrial'].includes(plan)) return;

    const cargar = () => getNotificacionesCliente().then(setNotif).catch(() => {});
    cargar();
    const iv = setInterval(cargar, 30_000);
    return () => clearInterval(iv);
  }, [usuario]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b-2 border-slate-700">
        <img src={LOGO_DARK} alt="Logo" className="h-12 w-auto object-contain" />
        <div className="text-slate-400 text-xs mt-2 font-medium tracking-wider uppercase">Activos bajo control</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const esMensajes = to === '/mensajes';
          const badge = esMensajes
            ? (notif.mensajesNoLeidos > 0 ? notif.mensajesNoLeidos : notif.tienePermisoPendiente ? '!' : 0)
            : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 min-h-[48px] font-sketch text-lg font-semibold transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white border-2 border-orange-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'
                }`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {!!badge && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-orange-500 text-white text-xs font-black rounded-none px-1 border border-orange-400">
                  {badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t-2 border-slate-700">
        {usuario ? (
          <>
            <div className="text-white text-sm font-semibold truncate">
              {usuario.empresa?.nombre ?? (usuario.rol === 'superadmin' ? 'ActivaQR · Admin' : usuario.nombre)}
            </div>
            <div className="text-slate-400 text-xs font-mono truncate">{usuario.email}</div>
            <button
              onClick={logout}
              className="mt-2 flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold"
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
            <div className="text-slate-600 text-xs font-mono mt-2">v1.1.0</div>
          </>
        ) : (
          <>
            <div className="text-slate-500 text-xs font-mono">Modo demo (local)</div>
            <div className="text-slate-600 text-xs font-mono">v1.1.0</div>
          </>
        )}
        <a
          href="https://portfolio-production-1f23.up.railway.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-3 pt-3 border-t border-slate-700 text-slate-500 hover:text-orange-400 text-xs font-mono transition-colors"
        >
          dev · Jesús Olguín
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b-2 border-slate-700 flex items-center justify-between px-4 h-14 box-content safe-top">
        <div className="flex items-center">
          <img src={LOGO_DARK} alt="Logo" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <button
            className="bg-orange-500 text-white p-2 border-2 border-orange-400"
            onClick={() => { navigate('/medicion'); }}
            title="Nueva medición"
          >
            <ClipboardList size={18} />
          </button>
          <button
            className="bg-slate-800 text-white p-2 border-2 border-slate-600"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`md:hidden fixed left-0 top-0 h-full w-64 z-50 transition-transform duration-200 safe-top bg-slate-900 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col w-64 flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </div>
    </>
  );
};
