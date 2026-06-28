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
import { AuroraBg } from '../ui/AuroraBg';

export const Layout: React.FC = () => {
  const cargando = useCargaRemota();
  const errorSync = useErrorSync();
  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen max-w-full bg-transparent overflow-hidden">
      <AuroraBg />
      <DemoBanner />
      {cargando && <PantallaCarga />}
      <Sidebar />
      <main id="app-scroll" className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="md:hidden h-safe-header" />
        <TrialBanner />
        <SyncBadge />
        {errorSync && (
          <div className="bg-danger text-white px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Sin conexión con el servidor</p>
                <p className="text-xs opacity-90 truncate">
                  Tus cambios NO se están guardando para no borrar nada. Recargá cuando vuelva la conexión.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="press flex items-center gap-1.5 bg-white/15 text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-white/25 transition-colors flex-shrink-0"
            >
              <RefreshCw size={13} /> Reintentar
            </button>
          </div>
        )}
        <div key={location.pathname} className="p-4 md:p-8 pb-28 md:pb-8 min-h-full max-w-full overflow-x-hidden animate-page-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
