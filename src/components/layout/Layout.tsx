// v1.1.0
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PantallaCarga } from '../PantallaCarga';
import { useCargaRemota } from '../../hooks/useStorage';
import { DemoBanner } from '../ui/DemoBanner';
import { SyncBadge } from '../ui/SyncBadge';
import { TrialBanner } from '../TrialUI';

export const Layout: React.FC = () => {
  const cargando = useCargaRemota();
  // Cambiar el key del wrapper en cada navegacion fuerza React a remontar
  // el contenido — combinado con la clase anim-fadein del CSS global,
  // genera transicion suave de fade entre paginas. Sin librerias extra.
  const location = useLocation();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FAFAF7] overflow-hidden">
      <DemoBanner />
      {cargando && <PantallaCarga />}
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Spacer for mobile fixed header (incluye safe-area de la barra de estado) */}
        <div className="md:hidden h-safe-header" />
        <TrialBanner />
        <SyncBadge />
        <div key={location.pathname} className="p-4 md:p-8 min-h-full anim-fadein">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
