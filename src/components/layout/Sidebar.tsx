import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

const LOGO_LIGHT = '/ActivaQr/company-logo-hd.png';   // negro, para fondo claro
const LOGO_DARK  = '/ActivaQr/company-logo1.png';      // claro, para fondo oscuro (sidebar navy)

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/activos', icon: Package, label: 'Activos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { to: '/reportes', icon: FileText, label: 'Reportes' },
  { to: '/importar', icon: Upload, label: 'Importar Datos' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas' },
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
];

export const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="px-5 py-5 border-b-2 border-slate-700">
        <img src={LOGO_DARK} alt="Logo" className="h-12 w-auto object-contain" />
        <div className="text-slate-400 text-xs mt-2 font-medium tracking-wider uppercase">Activos bajo control</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
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
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t-2 border-slate-700">
        <div className="text-slate-500 text-xs font-mono">Planta Patagónica S.A.</div>
        <div className="text-slate-600 text-xs font-mono">v1.0.0</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b-2 border-slate-700 flex items-center justify-between px-4 h-14">
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
        className={`md:hidden fixed left-0 top-0 h-full w-64 z-50 transition-transform duration-200 ${
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
