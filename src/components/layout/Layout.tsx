// v1.1.0
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { PantallaCarga } from '../PantallaCarga';
import { useCargaRemota, useErrorSync } from '../../hooks/useStorage';
import { DemoBanner } from '../ui/DemoBanner';
import { SyncBadge } from '../ui/SyncBadge';
import { TrialBanner } from '../TrialUI';

export const Layout: React.FC = () => {
  const cargando = useCargaRemota();
  const errorSync = useErrorSync();
  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FAFAF7] overflow-hidden">
      <DemoBanner />
      {cargando && <PantallaCarga />}
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden h-safe-header" />
        <TrialBanner />
        <SyncBadge />
        {errorSync && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between gap-3 border-b-2 border-red-900">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide">Sin conexion con el servidor</p>
                <p className="text-xs opacity-90 truncate">
                  Tus cambios NO se estan guardando para no borrar nada. Recarga cuando vuelva la conexion.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 bg-white text-red-700 px-3 py-1.5 text-xs font-black uppercase border-2 border-red-900 flex-shrink-0"
            >
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        )}
        <div key={location.pathname} className="p-4 md:p-8 min-h-full anim-fadein">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
