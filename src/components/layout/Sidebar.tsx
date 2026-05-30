import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wrench,
  FileText,
  Upload,
  QrCode,
  Menu,
  X,
  Zap,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/activos', icon: Package, label: 'Activos' },
  { to: '/medicion', icon: ClipboardList, label: 'Mediciones' },
  { to: '/mantenimiento', icon: Wrench, label: 'Mantenimiento' },
  { to: '/reportes', icon: FileText, label: 'Reportes' },
  { to: '/importar', icon: Upload, label: 'Importar Datos' },
  { to: '/qr', icon: QrCode, label: 'QR / Etiquetas' },
];

export const Sidebar: React.FC = () => {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="px-5 py-6 border-b-2 border-slate-700">
        <div className="flex items-center gap-2">
          <Zap size={24} className="text-orange-500" fill="currentColor" />
          <span className="text-2xl font-black text-orange-500 tracking-tight">ActivaQR</span>
        </div>
        <div className="text-slate-400 text-xs mt-1 font-medium tracking-wider uppercase">Activos bajo control</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 font-semibold text-sm transition-colors ${
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
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 border-2 border-slate-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
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
