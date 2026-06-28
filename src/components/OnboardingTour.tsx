import React, { useState } from 'react';

const TOUR_KEY = 'activaqr_tour_done';

const PASOS = [
  {
    titulo: 'Bienvenido a ActivaQR',
    texto: 'Te mostramos en 5 pasos como aprovechar la app al maximo. Podes omitir esto en cualquier momento.',
    posicion: 'center' as const,
  },
  {
    titulo: 'Dashboard',
    texto: 'Aca ves el estado general de todos tus activos. Las cards de arriba son accesos directos: tocalas para ir a cada seccion.',
    posicion: 'top-left' as const,
  },
  {
    titulo: 'Tus activos',
    texto: 'En "Activos" cargas cada maquina, vehiculo o equipo. Cada uno tiene su propio codigo QR para identificacion instantanea.',
    posicion: 'center' as const,
  },
  {
    titulo: 'Codigo QR',
    texto: 'Imprimi el QR de cada activo y pegalo en la maquina. Cualquier persona lo escanea y ve la ficha tecnica al instante, sin necesidad de cuenta.',
    posicion: 'center' as const,
  },
  {
    titulo: 'Mediciones y alertas',
    texto: 'Tu equipo carga mediciones periodicas. El sistema evalua automaticamente si los valores estan dentro de rango y cambia el estado del activo a Normal, Alerta o Critico.',
    posicion: 'center' as const,
  },
  {
    titulo: 'Listo para usar',
    texto: 'Si necesitas ayuda en cualquier momento, podes reactivar esta guia desde Configuracion. Ahora si, empieza cargando tus primeros activos.',
    posicion: 'center' as const,
    esUltimo: true,
  },
];

export const OnboardingTour: React.FC = () => {
  const [paso, setPaso] = useState<number>(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(TOUR_KEY)) return -1;
    return 0;
  });

  if (paso === -1) return null;

  const pasoActual = PASOS[paso];
  const esCentrado = pasoActual.posicion === 'center';

  const avanzar = () => {
    if (paso >= PASOS.length - 1 || pasoActual.esUltimo) {
      localStorage.setItem(TOUR_KEY, '1');
      setPaso(-1);
    } else {
      setPaso((p) => p + 1);
    }
  };

  const omitir = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setPaso(-1);
  };

  const burbuja = (
    <div className="bg-white border border-slate-900 shadow-soft p-5 w-full max-w-xs sm:max-w-sm">
      <p className="font-display font-bold uppercase text-slate-900 text-lg mb-2">{pasoActual.titulo}</p>
      <p className="text-sm text-slate-600 mb-4">{pasoActual.texto}</p>

      <div className="flex items-center gap-1.5 mb-4">
        {PASOS.map((_, i) => (
          <span
            key={i}
            className={`inline-block rounded-full transition-all ${
              i === paso ? 'w-3 h-3 bg-brand-600' : 'w-2 h-2 bg-slate-300'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={omitir}
          className="text-xs font-bold text-slate-500 border border-slate-300 px-3 py-1.5 hover:border-slate-500 transition-colors"
        >
          Omitir todo
        </button>
        <button
          onClick={avanzar}
          className="bg-brand-600 text-white text-sm font-bold px-4 py-2 border border-slate-900 shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-soft transition-all"
        >
          {pasoActual.esUltimo ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  );

  if (esCentrado) {
    return (
      <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
        {burbuja}
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-4 z-[200]">
      {burbuja}
    </div>
  );
};
