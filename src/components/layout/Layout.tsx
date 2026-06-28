// v1.1.0
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PantallaCarga } from '../PantallaCarga';
import { useCargaRemota } from '../../hooks/useStorage';
import { DemoBanner } from '../ui/DemoBanner';

export const Layout: React.FC = () => {
  const cargando = useCargaRemota();

  return (
    <div className="app-shell flex flex-col md:flex-row bg-canvas">
      <DemoBanner />
      {cargando && <PantallaCarga />}
      <Sidebar />
      <main className="app-main">
        {/* Spacer para el header fijo de mobile (incluye safe-area) */}
        <div className="md:hidden h-safe-header" />
        <div className="p-4 sm:p-6 md:p-8 min-h-full max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
        {/* Spacer para la bottom nav de mobile */}
        <div className="md:hidden h-safe-bottomnav" />
      </main>
    </div>
  );
};
