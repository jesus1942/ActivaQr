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
  Lock,
  Star,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNotificacionesCliente } from '../../data/accesoRemotoApi';
import { hasFeature, planLabel, planRequerido, type Feature } from '../../data/planes';

const LOGO_LIGHT = '/ActivaQr/company-logo-hd.png';   // negro, para fondo claro
const LOGO_DARK  = '/ActivaQr/company-logo1.png';      // claro, para fondo oscuro (sidebar navy)

const navEmpresa: Array<{ to: string; icon: typeof LayoutDashboard; label: string; sub?: string; feature?: Feature }> = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', sub: 'Resumen del día' },
  { to: '/indicadores', icon: BarChart3, label: 'Indicadores', sub: 'KPIs y gráficos', feature: 'indicadores' },
  { to: '/activos', icon: Package, label: 'Activos', sub: 'Tus equipos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones', sub: 'Cargar lectura' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento', sub: 'Tareas y planes' },
  { to: '/reportes', icon: FileText, label: 'Reportes', sub: 'Exportar PDF/CSV' },
  { to: '/auditoria', icon: ScrollText, label: 'Auditoría', sub: 'Quién hizo qué', feature: 'auditoria' },
  { to: '/importar', icon: Upload, label: 'Importar Datos', sub: 'Carga masiva' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas', sub: 'Imprimir códigos' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/configuracion', icon: Settings, label: 'Configuración', sub: 'Sectores, tipos, usuarios' },
];

const navSuperadmin: Array<{ to: string; icon: typeof LayoutDashboard; label: string; sub?: string }> = [
  { to: '/', icon: Building2, label: 'Empresas' },
  { to: '/analitica', icon: LineChart, label: 'Analítica' },
  { to: '/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { to: '/testimonios', icon: Star, label: 'Testimonios', sub: 'Moderar landing' },
];

export const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState({ mensajesNoLeidos: 0, tienePermisoPendiente: false });
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();

  const navItems = usuario?.rol === 'superadmin' ? navSuperadmin : navEmpresa;
  const planActual = usuario?.empresa?.plan ?? 'inicial';

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
      {/* Logo + X mobile */}
      <div className="px-5 py-5 border-b-2 border-slate-700 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <img src={LOGO_DARK} alt="Logo" className="h-12 w-auto object-contain" />
          <div className="text-slate-400 text-xs mt-2 font-medium tracking-wider uppercase">Activos bajo control</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="md:hidden flex-shrink-0 w-11 h-11 flex items-center justify-center bg-orange-500 text-white border-2 border-orange-400 active:translate-y-[1px]"
          aria-label="Cerrar menú"
        >
          <X size={22} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const { to, icon: Icon, label, sub } = item;
          const feature: Feature | undefined = ('feature' in item ? item.feature : undefined) as Feature | undefined;
          const esMensajes = to === '/mensajes';
          const badge = esMensajes
            ? (notif.mensajesNoLeidos > 0 ? notif.mensajesNoLeidos : notif.tienePermisoPendiente ? '!' : 0)
            : 0;
          const bloqueado = feature ? !hasFeature(planActual, feature) : false;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 min-h-[52px] font-sketch font-semibold transition-colors ${
                  isActive
                    ? 'bg-orange-500 text-white border-2 border-orange-400'
                    : bloqueado
                      ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300 border-2 border-transparent'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border-2 border-transparent'
                }`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={20} className="flex-shrink-0" />
              <span className="flex-1 min-w-0 leading-tight">
                <span className="block text-lg">{label}</span>
                {sub && <span className="block text-[11px] font-normal opacity-70 normal-case tracking-normal">{sub}</span>}
              </span>
              {bloqueado && (
                <Lock size={14} className="text-slate-500 flex-shrink-0" />
              )}
              {!!badge && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-orange-500 text-white text-xs font-black rounded-none px-1 border border-orange-400 flex-shrink-0">
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
            className="flex items-center gap-1.5 bg-slate-800 text-white px-3 h-10 border-2 border-slate-600 font-black uppercase text-xs tracking-wider"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
            <span>{open ? 'Cerrar' : 'Menú'}</span>
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
