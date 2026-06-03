// v1.1.0
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PantallaCarga } from '../PantallaCarga';
import { useCargaRemota } from '../../hooks/useStorage';
import { DemoBanner } from '../ui/DemoBanner';
import { TrialBanner } from '../TrialUI';

export const Layout: React.FC = () => {
  const cargando = useCargaRemota();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#FAFAF7] overflow-hidden">
      <DemoBanner />
      {cargando && <PantallaCarga />}
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Spacer for mobile fixed header (incluye safe-area de la barra de estado) */}
        <div className="md:hidden h-safe-header" />
        <TrialBanner />
        <div className="p-4 md:p-8 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
