import React from 'react';
import { Lock, Sparkles, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { planLabel, planRequerido, type Feature } from '../data/planes';

interface Props {
  feature: Feature;
  titulo: string;
  descripcion: string;
}

// Pantalla de bloqueo no destructiva: la seccion existe pero la cubre
// un overlay que invita a hacer upgrade. NO redirecciona: el usuario
// puede cerrar y volver a su trabajo.
export const FeatureLock: React.FC<Props> = ({ feature, titulo, descripcion }) => {
  const navigate = useNavigate();
  const plan = planRequerido(feature);

  return (
    <div className="max-w-xl mx-auto mt-8">
      <div className="bg-surface border border-line shadow-soft p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-brand-600 text-white border border-line flex items-center justify-center flex-shrink-0">
            <Lock size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-brand-600">Disponible en plan {planLabel(plan)}</p>
            <h1 className="font-display text-2xl font-black text-content uppercase leading-tight">{titulo}</h1>
          </div>
        </div>
        <p className="text-content leading-relaxed mb-6">{descripcion}</p>
        <div className="bg-brand-50 border border-brand-200 p-4 mb-6">
          <div className="flex items-start gap-2">
            <Sparkles size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-content">
              Esta sección es parte del plan <strong>{planLabel(plan)}</strong>. Si ya tenés ese plan, contactá soporte para activarla.
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => navigate('/configuracion')}
            className="flex-1 flex items-center justify-center gap-2 bg-brand-600 text-white px-4 min-h-[48px] font-black uppercase tracking-wide border border-line shadow-soft hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-soft transition-all text-sm"
          >
            Mejorar mi plan
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-surface text-content px-4 min-h-[48px] font-bold border border-line-strong text-sm"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
