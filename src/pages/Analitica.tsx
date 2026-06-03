import React, { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import { Estadisticas, getEstadisticas, reiniciarEstadisticas } from '../data/adminApi';
import { PanelEstadisticas } from './Admin';

export const Analitica: React.FC = () => {
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [error, setError] = useState('');

  const cargar = () => getEstadisticas().then(setEstadisticas).catch((e) => setError(e.message));

  useEffect(() => { cargar(); }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-sketch text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <LineChart size={32} className="text-orange-500" /> Analítica
        </h1>
        <p className="text-slate-500 text-sm mt-1">Visitas, ubicaciones, dispositivos, cuentas de prueba y uso de secciones</p>
      </div>

      {error && <p className="text-red-600 font-bold">{error}</p>}
      {!estadisticas && !error && <p className="text-slate-500">Cargando analítica...</p>}

      {estadisticas && (
        <PanelEstadisticas
          estadisticas={estadisticas}
          onReiniciar={async () => {
            if (!confirm('Reiniciar el contador de visitas? Se borran todos los registros de visitas y escaneos.')) return;
            await reiniciarEstadisticas();
            cargar();
          }}
        />
      )}
    </div>
  );
};
